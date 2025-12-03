// ========================================
// Hotel Partner API Routes
// ========================================

const express = require('express');
const router = express.Router();
const HotelPartner = require('../models/HotelPartner');
const Booking = require('../models/Booking');

// Middleware to authenticate hotel partner API
const authenticatePartner = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    try {
        const partner = await HotelPartner.findByApiKey(apiKey);
        if (!partner) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Check IP whitelist
        if (partner.api.allowedIPs?.length > 0) {
            const clientIP = req.ip || req.connection.remoteAddress;
            if (!partner.api.allowedIPs.includes(clientIP)) {
                return res.status(403).json({ error: 'IP not authorized' });
            }
        }

        req.partner = partner;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// ========================================
// Public Routes
// ========================================

// Partner registration request
router.post('/register', async (req, res) => {
    try {
        const {
            hotelName,
            brand,
            category,
            starRating,
            address,
            zone,
            contactName,
            contactEmail,
            contactPhone,
            contactPosition,
            website
        } = req.body;

        // Validation
        if (!hotelName || !address || !contactName || !contactEmail || !contactPhone) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        // Check for existing
        const existing = await HotelPartner.findOne({
            'contacts.primary.email': contactEmail.toLowerCase()
        });

        if (existing) {
            return res.status(409).json({ error: 'Partner registration already exists' });
        }

        const partner = new HotelPartner({
            hotel: {
                name: hotelName,
                brand,
                category,
                starRating,
                website
            },
            location: {
                address,
                zone: zone || 2
            },
            contacts: {
                primary: {
                    name: contactName,
                    email: contactEmail.toLowerCase(),
                    phone: contactPhone,
                    position: contactPosition
                }
            },
            status: 'pending'
        });

        await partner.save();

        res.status(201).json({
            success: true,
            message: 'Partner registration submitted',
            partnerId: partner.partnerId
        });

    } catch (error) {
        console.error('[Partners] Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Authenticated Partner Routes
// ========================================

// Get partner profile
router.get('/profile', authenticatePartner, async (req, res) => {
    const partner = req.partner;

    res.json({
        success: true,
        partner: {
            partnerId: partner.partnerId,
            hotel: partner.hotel,
            location: partner.location,
            commission: {
                model: partner.commission.model,
                percentage: partner.commission.percentage
            },
            guestPricing: partner.guestPricing,
            stats: partner.stats,
            status: partner.status
        }
    });
});

// Get pricing for guest transfer
router.post('/pricing', authenticatePartner, async (req, res) => {
    try {
        const { vehicleClass = 'standard', passengers = 1, pickupTime } = req.body;
        const partner = req.partner;

        // Base prices by zone
        const zonePrices = {
            1: { standard: 25, executive: 35, suv: 45, luxury: 75 },
            2: { standard: 35, executive: 50, suv: 65, luxury: 100 },
            3: { standard: 45, executive: 65, suv: 85, luxury: 130 },
            4: { standard: 55, executive: 80, suv: 105, luxury: 160 },
            5: { standard: 70, executive: 100, suv: 130, luxury: 200 }
        };

        const zone = partner.location.zone || 2;
        const basePrice = zonePrices[zone]?.[vehicleClass] || zonePrices[2].standard;

        // Apply guest discount
        const guestDiscount = partner.getGuestDiscount(vehicleClass);
        let finalPrice = basePrice;

        if (guestDiscount.type === 'fixed') {
            finalPrice = guestDiscount.rate;
        } else if (guestDiscount.discount > 0) {
            finalPrice = basePrice * (1 - guestDiscount.discount / 100);
        }

        // Calculate commission
        const commission = partner.calculateCommission(finalPrice);

        res.json({
            success: true,
            pricing: {
                basePrice,
                guestDiscount: guestDiscount.type === 'percentage' ? guestDiscount.discount : 0,
                finalPrice: Math.round(finalPrice * 100) / 100,
                hotelCommission: Math.round(commission * 100) / 100,
                vehicleClass,
                zone,
                currency: 'USD'
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create booking for hotel guest
router.post('/bookings', authenticatePartner, async (req, res) => {
    try {
        const partner = req.partner;
        const {
            guest,
            tripType,
            flight,
            pickupTime,
            dropoffLocation,
            vehicleClass = 'standard',
            passengers = 1,
            luggage = 1,
            specialRequests,
            roomNumber,
            reservationId
        } = req.body;

        // Validation
        if (!guest?.name || !guest?.email) {
            return res.status(400).json({ error: 'Guest details required' });
        }
        if (!pickupTime) {
            return res.status(400).json({ error: 'Pickup time required' });
        }

        // Calculate pricing
        const zonePrices = {
            1: { standard: 25, executive: 35, suv: 45, luxury: 75 },
            2: { standard: 35, executive: 50, suv: 65, luxury: 100 },
            3: { standard: 45, executive: 65, suv: 85, luxury: 130 },
            4: { standard: 55, executive: 80, suv: 105, luxury: 160 },
            5: { standard: 70, executive: 100, suv: 130, luxury: 200 }
        };

        const zone = partner.location.zone || 2;
        let basePrice = zonePrices[zone]?.[vehicleClass] || zonePrices[2].standard;

        const guestDiscount = partner.getGuestDiscount(vehicleClass);
        let finalPrice = basePrice;

        if (guestDiscount.type === 'fixed') {
            finalPrice = guestDiscount.rate;
        } else if (guestDiscount.discount > 0) {
            finalPrice = basePrice * (1 - guestDiscount.discount / 100);
        }

        // Create booking
        const booking = new Booking({
            type: tripType || 'departure',
            flight: flight ? {
                number: flight.number,
                airline: flight.airline,
                scheduledTime: flight.scheduledTime
            } : undefined,
            pickup: {
                location: tripType === 'arrival' ? 'Bole International Airport' : partner.hotel.name,
                address: tripType === 'arrival' ? 'ADD Airport' : partner.location.address,
                scheduledTime: new Date(pickupTime),
                notes: roomNumber ? `Room: ${roomNumber}` : undefined
            },
            dropoff: {
                location: tripType === 'arrival' ? partner.hotel.name : (dropoffLocation || 'Bole International Airport'),
                address: tripType === 'arrival' ? partner.location.address : undefined,
                zone
            },
            vehicleClass,
            passengers,
            luggage,
            specialRequests,
            contact: {
                name: guest.name,
                email: guest.email,
                phone: guest.phone || partner.contacts.reservations?.phone
            },
            pricing: {
                baseFare: basePrice,
                discount: guestDiscount.type === 'percentage' ? guestDiscount.discount : 0,
                totalUSD: finalPrice
            },
            status: partner.integration.autoConfirm ? 'confirmed' : 'pending',
            source: 'partner',
            corporateReference: `${partner.partnerId}-${reservationId || Date.now()}`
        });

        await booking.save();

        // Update partner stats
        const commission = partner.calculateCommission(finalPrice);
        await partner.recordBooking(finalPrice, commission);

        // Send webhook if configured
        if (partner.api.webhookUrl) {
            // Would send webhook notification here
        }

        res.status(201).json({
            success: true,
            booking: {
                bookingReference: booking.bookingReference,
                guestName: guest.name,
                pickupTime: booking.pickup.scheduledTime,
                pickupLocation: booking.pickup.location,
                dropoffLocation: booking.dropoff.location,
                vehicleClass,
                price: finalPrice,
                status: booking.status,
                hotelCommission: commission
            }
        });

    } catch (error) {
        console.error('[Partners] Booking error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get partner's bookings
router.get('/bookings', authenticatePartner, async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
        const partner = req.partner;

        const query = {
            corporateReference: { $regex: `^${partner.partnerId}` }
        };

        if (status) query.status = status;
        if (startDate || endDate) {
            query['pickup.scheduledTime'] = {};
            if (startDate) query['pickup.scheduledTime'].$gte = new Date(startDate);
            if (endDate) query['pickup.scheduledTime'].$lte = new Date(endDate);
        }

        const bookings = await Booking.find(query)
            .select('bookingReference contact.name pickup dropoff vehicleClass pricing.totalUSD status createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Booking.countDocuments(query);

        res.json({
            success: true,
            bookings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific booking
router.get('/bookings/:reference', authenticatePartner, async (req, res) => {
    try {
        const { reference } = req.params;
        const partner = req.partner;

        const booking = await Booking.findOne({
            bookingReference: reference,
            corporateReference: { $regex: `^${partner.partnerId}` }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ success: true, booking });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel booking
router.post('/bookings/:reference/cancel', authenticatePartner, async (req, res) => {
    try {
        const { reference } = req.params;
        const { reason } = req.body;
        const partner = req.partner;

        const booking = await Booking.findOne({
            bookingReference: reference,
            corporateReference: { $regex: `^${partner.partnerId}` }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (['completed', 'cancelled'].includes(booking.status)) {
            return res.status(400).json({ error: 'Cannot cancel this booking' });
        }

        booking.status = 'cancelled';
        booking.statusHistory.push({
            status: 'cancelled',
            note: `Cancelled by hotel: ${reason || 'No reason provided'}`,
            timestamp: new Date()
        });

        await booking.save();

        res.json({
            success: true,
            message: 'Booking cancelled',
            bookingReference: reference
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get commission report
router.get('/reports/commission', authenticatePartner, async (req, res) => {
    try {
        const { month, year } = req.query;
        const partner = req.partner;

        const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

        const bookings = await Booking.find({
            corporateReference: { $regex: `^${partner.partnerId}` },
            status: 'completed',
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const totalRevenue = bookings.reduce((sum, b) => sum + (b.pricing?.totalUSD || 0), 0);
        const totalCommission = bookings.reduce((sum, b) => {
            return sum + partner.calculateCommission(b.pricing?.totalUSD || 0);
        }, 0);

        res.json({
            success: true,
            report: {
                period: {
                    month: startDate.toLocaleString('en', { month: 'long' }),
                    year: startDate.getFullYear()
                },
                totalBookings: bookings.length,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalCommission: Math.round(totalCommission * 100) / 100,
                commissionRate: partner.commission.percentage,
                currency: 'USD'
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Admin Routes
// ========================================

// List all partners
router.get('/admin/list', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;

        const partners = await HotelPartner.find(query)
            .select('partnerId hotel.name location.address status stats.totalBookings createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await HotelPartner.countDocuments(query);

        res.json({
            success: true,
            partners,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve partner
router.post('/admin/:partnerId/approve', async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { commission, zone } = req.body;

        const partner = await HotelPartner.findOne({ partnerId });
        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        partner.status = 'active';
        if (commission) partner.commission.percentage = commission;
        if (zone) partner.location.zone = zone;

        await partner.generateApiKey();

        res.json({
            success: true,
            message: 'Partner approved',
            apiKey: partner.api.apiKey
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
