// ========================================
// Corporate Pricing Service
// ========================================
// B2B pricing engine with tiered discounts,
// volume pricing, and custom rate management
// ========================================

const CorporateAccount = require('../models/CorporateAccount');

// Base pricing matrix (USD)
const BASE_PRICING = {
    zones: {
        // Airport to zone prices
        1: { standard: 25, executive: 35, suv: 45, luxury: 75 },
        2: { standard: 35, executive: 50, suv: 65, luxury: 100 },
        3: { standard: 45, executive: 65, suv: 85, luxury: 130 },
        4: { standard: 55, executive: 80, suv: 105, luxury: 160 },
        5: { standard: 70, executive: 100, suv: 130, luxury: 200 }
    },
    // Additional fees
    fees: {
        childSeat: 5,
        meetAndGreet: 10,
        extraStop: 10,
        waitingTime: 15, // Per hour after 1 hour free
        lateNight: 10, // 22:00 - 06:00
        earlyMorning: 5, // 04:00 - 06:00
        holiday: 15,
        luggageExtra: 5 // Per extra piece over 2
    }
};

// Tier configurations
const TIER_CONFIG = {
    standard: {
        name: 'Standard',
        baseDiscount: 0,
        minMonthlyBookings: 0,
        creditLimit: 0,
        paymentTerms: 0, // Prepaid only
        features: ['basic_support', 'email_receipts']
    },
    silver: {
        name: 'Silver',
        baseDiscount: 5,
        minMonthlyBookings: 10,
        creditLimit: 500,
        paymentTerms: 15,
        features: ['priority_support', 'monthly_invoice', 'email_receipts', 'cost_centers']
    },
    gold: {
        name: 'Gold',
        baseDiscount: 10,
        minMonthlyBookings: 30,
        creditLimit: 2000,
        paymentTerms: 30,
        features: ['priority_support', 'monthly_invoice', 'dedicated_account_manager', 'api_access', 'custom_reports']
    },
    platinum: {
        name: 'Platinum',
        baseDiscount: 15,
        minMonthlyBookings: 100,
        creditLimit: 10000,
        paymentTerms: 45,
        features: ['24_7_support', 'weekly_invoice', 'dedicated_account_manager', 'api_access', 'custom_reports', 'priority_dispatch']
    },
    custom: {
        name: 'Custom',
        baseDiscount: 0, // Negotiated
        minMonthlyBookings: 0,
        creditLimit: 0, // Negotiated
        paymentTerms: 30,
        features: ['all']
    }
};

class CorporatePricingService {
    constructor() {
        this.basePricing = BASE_PRICING;
        this.tierConfig = TIER_CONFIG;
    }

    /**
     * Calculate price for a corporate booking
     * @param {object} options - Booking options
     * @param {string} options.corporateAccountId - Corporate account ID
     * @param {number} options.zone - Destination zone (1-5)
     * @param {string} options.vehicleClass - Vehicle class
     * @param {object} options.extras - Additional services
     * @param {Date} options.pickupTime - Pickup time
     * @returns {object} Pricing breakdown
     */
    async calculateCorporatePrice(options) {
        const {
            corporateAccountId,
            zone,
            vehicleClass = 'standard',
            extras = {},
            pickupTime,
            passengers = 1,
            luggage = 1
        } = options;

        // Get corporate account
        const account = await CorporateAccount.findOne({
            $or: [
                { _id: corporateAccountId },
                { accountId: corporateAccountId }
            ],
            status: 'active'
        });

        if (!account) {
            // Return standard pricing if no corporate account
            return this.calculateStandardPrice(options);
        }

        // Check for custom rate first
        const customRate = account.getCustomRate(0, zone, vehicleClass);
        let basePrice;

        if (customRate) {
            basePrice = customRate;
        } else {
            basePrice = this.getBasePrice(zone, vehicleClass);
        }

        // Calculate additional fees
        const fees = this.calculateFees(extras, pickupTime, luggage);

        // Calculate subtotal before discount
        const subtotalBeforeDiscount = basePrice + fees.total;

        // Apply corporate discount
        const discountInfo = account.calculateDiscount(subtotalBeforeDiscount, vehicleClass);

        // Calculate final price
        const finalPrice = discountInfo.finalPrice;

        // Currency conversion
        const exchangeRate = parseFloat(process.env.USD_ETB_RATE) || 56.5;
        const finalPriceETB = Math.round(finalPrice * exchangeRate);

        return {
            corporateAccount: {
                id: account.accountId,
                name: account.company.name,
                tier: account.pricingTier
            },
            pricing: {
                basePrice,
                customRate: !!customRate,
                fees: fees.breakdown,
                feesTotal: fees.total,
                subtotalBeforeDiscount,
                discount: {
                    percentage: discountInfo.discountPercentage,
                    amount: discountInfo.discountAmount,
                    type: customRate ? 'custom_rate' : 'tier_discount'
                },
                finalPriceUSD: Math.round(finalPrice * 100) / 100,
                finalPriceETB,
                currency: account.billing.currency,
                exchangeRate
            },
            billing: {
                method: account.billing.method,
                currentBalance: account.billing.currentBalance,
                creditAvailable: account.billing.creditLimit + account.billing.currentBalance,
                requiresPO: account.billing.requirePO
            },
            vehicleClass,
            zone,
            passengers,
            pickupTime
        };
    }

    /**
     * Calculate standard (non-corporate) price
     */
    calculateStandardPrice(options) {
        const {
            zone,
            vehicleClass = 'standard',
            extras = {},
            pickupTime,
            luggage = 1
        } = options;

        const basePrice = this.getBasePrice(zone, vehicleClass);
        const fees = this.calculateFees(extras, pickupTime, luggage);
        const subtotal = basePrice + fees.total;

        const exchangeRate = parseFloat(process.env.USD_ETB_RATE) || 56.5;

        return {
            corporateAccount: null,
            pricing: {
                basePrice,
                customRate: false,
                fees: fees.breakdown,
                feesTotal: fees.total,
                subtotalBeforeDiscount: subtotal,
                discount: {
                    percentage: 0,
                    amount: 0,
                    type: null
                },
                finalPriceUSD: subtotal,
                finalPriceETB: Math.round(subtotal * exchangeRate),
                currency: 'USD',
                exchangeRate
            },
            billing: {
                method: 'standard',
                requiresPO: false
            },
            vehicleClass,
            zone
        };
    }

    /**
     * Get base price for zone and vehicle class
     */
    getBasePrice(zone, vehicleClass) {
        const zoneData = this.basePricing.zones[zone];
        if (!zoneData) {
            throw new Error(`Invalid zone: ${zone}`);
        }
        const price = zoneData[vehicleClass];
        if (!price) {
            throw new Error(`Invalid vehicle class: ${vehicleClass}`);
        }
        return price;
    }

    /**
     * Calculate additional fees
     */
    calculateFees(extras = {}, pickupTime, luggage = 1) {
        const fees = this.basePricing.fees;
        const breakdown = {};
        let total = 0;

        // Child seat
        if (extras.childSeat) {
            breakdown.childSeat = fees.childSeat;
            total += fees.childSeat;
        }

        // Meet and greet
        if (extras.meetAndGreet) {
            breakdown.meetAndGreet = fees.meetAndGreet;
            total += fees.meetAndGreet;
        }

        // Extra stops
        if (extras.extraStops && extras.extraStops > 0) {
            const extraStopFee = fees.extraStop * extras.extraStops;
            breakdown.extraStops = extraStopFee;
            total += extraStopFee;
        }

        // Extra luggage (over 2 pieces)
        if (luggage > 2) {
            const extraLuggageFee = fees.luggageExtra * (luggage - 2);
            breakdown.extraLuggage = extraLuggageFee;
            total += extraLuggageFee;
        }

        // Time-based fees
        if (pickupTime) {
            const hour = new Date(pickupTime).getHours();

            // Late night (22:00 - 04:00)
            if (hour >= 22 || hour < 4) {
                breakdown.lateNight = fees.lateNight;
                total += fees.lateNight;
            }
            // Early morning (04:00 - 06:00)
            else if (hour >= 4 && hour < 6) {
                breakdown.earlyMorning = fees.earlyMorning;
                total += fees.earlyMorning;
            }

            // Holiday check (simplified)
            if (this.isHoliday(pickupTime)) {
                breakdown.holiday = fees.holiday;
                total += fees.holiday;
            }
        }

        return { breakdown, total };
    }

    /**
     * Check if date is a holiday (Ethiopian holidays)
     */
    isHoliday(date) {
        const d = new Date(date);
        const month = d.getMonth() + 1;
        const day = d.getDate();

        // Ethiopian holidays (Gregorian calendar approximations)
        const holidays = [
            { month: 1, day: 7 },   // Ethiopian Christmas
            { month: 1, day: 19 },  // Timkat
            { month: 3, day: 2 },   // Victory of Adwa
            { month: 5, day: 1 },   // Labor Day
            { month: 5, day: 5 },   // Patriots Day
            { month: 5, day: 28 },  // Downfall of Derg
            { month: 9, day: 11 },  // Ethiopian New Year
            { month: 9, day: 27 }   // Meskel
        ];

        return holidays.some(h => h.month === month && h.day === day);
    }

    /**
     * Get volume discount recommendations
     */
    getVolumeRecommendations(currentMonthlyBookings, currentTier) {
        const recommendations = [];
        const tierOrder = ['standard', 'silver', 'gold', 'platinum'];
        const currentIndex = tierOrder.indexOf(currentTier);

        if (currentIndex < tierOrder.length - 1) {
            const nextTier = tierOrder[currentIndex + 1];
            const nextConfig = this.tierConfig[nextTier];

            if (currentMonthlyBookings >= nextConfig.minMonthlyBookings * 0.8) {
                recommendations.push({
                    type: 'tier_upgrade',
                    currentTier,
                    recommendedTier: nextTier,
                    additionalDiscount: nextConfig.baseDiscount - this.tierConfig[currentTier].baseDiscount,
                    requiredBookings: nextConfig.minMonthlyBookings,
                    currentBookings: currentMonthlyBookings,
                    message: `You're close to ${nextConfig.name} tier! ${nextConfig.minMonthlyBookings - currentMonthlyBookings} more bookings this month to upgrade.`
                });
            }
        }

        return recommendations;
    }

    /**
     * Calculate bulk booking discount
     */
    calculateBulkDiscount(numberOfBookings, baseTotal) {
        let discountPercentage = 0;

        if (numberOfBookings >= 50) {
            discountPercentage = 15;
        } else if (numberOfBookings >= 20) {
            discountPercentage = 10;
        } else if (numberOfBookings >= 10) {
            discountPercentage = 7;
        } else if (numberOfBookings >= 5) {
            discountPercentage = 5;
        }

        return {
            numberOfBookings,
            baseTotal,
            discountPercentage,
            discountAmount: baseTotal * (discountPercentage / 100),
            finalTotal: baseTotal * (1 - discountPercentage / 100)
        };
    }

    /**
     * Generate quote for corporate client
     */
    async generateCorporateQuote(corporateAccountId, bookings) {
        const account = await CorporateAccount.findOne({
            $or: [
                { _id: corporateAccountId },
                { accountId: corporateAccountId }
            ]
        });

        if (!account) {
            throw new Error('Corporate account not found');
        }

        const quoteItems = [];
        let subtotal = 0;

        for (const booking of bookings) {
            const pricing = await this.calculateCorporatePrice({
                corporateAccountId,
                zone: booking.zone,
                vehicleClass: booking.vehicleClass || 'standard',
                extras: booking.extras || {},
                pickupTime: booking.pickupTime,
                passengers: booking.passengers,
                luggage: booking.luggage
            });

            quoteItems.push({
                description: `Zone ${booking.zone} - ${booking.vehicleClass || 'Standard'}`,
                ...pricing.pricing,
                quantity: booking.quantity || 1
            });

            subtotal += pricing.pricing.finalPriceUSD * (booking.quantity || 1);
        }

        // Apply bulk discount if applicable
        const bulkDiscount = this.calculateBulkDiscount(bookings.length, subtotal);

        const exchangeRate = parseFloat(process.env.USD_ETB_RATE) || 56.5;

        return {
            quoteId: `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            corporateAccount: {
                id: account.accountId,
                name: account.company.name,
                tier: account.pricingTier
            },
            items: quoteItems,
            summary: {
                subtotal,
                bulkDiscount: bulkDiscount.discountAmount,
                bulkDiscountPercentage: bulkDiscount.discountPercentage,
                total: bulkDiscount.finalTotal,
                totalETB: Math.round(bulkDiscount.finalTotal * exchangeRate),
                currency: account.billing.currency,
                exchangeRate
            },
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            createdAt: new Date()
        };
    }

    /**
     * Get pricing tiers info
     */
    getTierInfo(tierName = null) {
        if (tierName) {
            return {
                tier: tierName,
                ...this.tierConfig[tierName]
            };
        }
        return Object.entries(this.tierConfig).map(([key, config]) => ({
            tier: key,
            ...config
        }));
    }

    /**
     * Calculate monthly statement
     */
    async generateMonthlyStatement(corporateAccountId, year, month) {
        const Booking = require('../models/Booking');

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const account = await CorporateAccount.findOne({
            $or: [
                { _id: corporateAccountId },
                { accountId: corporateAccountId }
            ]
        });

        if (!account) {
            throw new Error('Corporate account not found');
        }

        const bookings = await Booking.find({
            corporateAccountId: account._id,
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['completed', 'confirmed'] }
        }).sort({ createdAt: 1 });

        const statement = {
            statementId: `STMT-${account.accountId}-${year}${String(month).padStart(2, '0')}`,
            corporateAccount: {
                id: account.accountId,
                name: account.company.name,
                address: account.address,
                contact: account.contact.billing || account.contact.primary
            },
            period: {
                start: startDate,
                end: endDate,
                month: new Date(year, month - 1).toLocaleString('en', { month: 'long' }),
                year
            },
            bookings: bookings.map(b => ({
                reference: b.bookingReference,
                date: b.createdAt,
                pickup: b.pickup.location,
                dropoff: b.dropoff.location,
                vehicleClass: b.vehicleClass,
                amount: b.pricing.totalUSD,
                status: b.status,
                costCenter: b.corporateReference
            })),
            summary: {
                totalBookings: bookings.length,
                totalAmount: bookings.reduce((sum, b) => sum + b.pricing.totalUSD, 0),
                totalAmountETB: bookings.reduce((sum, b) => sum + (b.pricing.totalETB || 0), 0),
                byVehicleClass: this.groupByVehicleClass(bookings),
                byCostCenter: this.groupByCostCenter(bookings)
            },
            billing: {
                method: account.billing.method,
                paymentTerms: account.billing.paymentTerms,
                dueDate: new Date(endDate.getTime() + account.billing.paymentTerms * 24 * 60 * 60 * 1000),
                previousBalance: 0, // Would need transaction history
                currentCharges: bookings.reduce((sum, b) => sum + b.pricing.totalUSD, 0),
                payments: 0, // Would need payment history
                balanceDue: bookings.reduce((sum, b) => sum + b.pricing.totalUSD, 0)
            },
            generatedAt: new Date()
        };

        return statement;
    }

    /**
     * Group bookings by vehicle class
     */
    groupByVehicleClass(bookings) {
        const groups = {};
        for (const booking of bookings) {
            const vc = booking.vehicleClass || 'standard';
            if (!groups[vc]) {
                groups[vc] = { count: 0, total: 0 };
            }
            groups[vc].count++;
            groups[vc].total += booking.pricing.totalUSD;
        }
        return groups;
    }

    /**
     * Group bookings by cost center
     */
    groupByCostCenter(bookings) {
        const groups = {};
        for (const booking of bookings) {
            const cc = booking.corporateReference || 'Unassigned';
            if (!groups[cc]) {
                groups[cc] = { count: 0, total: 0 };
            }
            groups[cc].count++;
            groups[cc].total += booking.pricing.totalUSD;
        }
        return groups;
    }
}

module.exports = new CorporatePricingService();
