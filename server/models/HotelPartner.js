// ========================================
// Hotel Partner Model
// ========================================

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const hotelPartnerSchema = new mongoose.Schema({
    // Partner identification
    partnerId: {
        type: String,
        unique: true,
        default: () => `HTL-${uuidv4().substring(0, 8).toUpperCase()}`
    },

    // Hotel information
    hotel: {
        name: { type: String, required: true },
        brand: String, // e.g., Hilton, Marriott
        category: {
            type: String,
            enum: ['budget', 'mid_range', 'upscale', 'luxury', 'boutique'],
            default: 'mid_range'
        },
        starRating: { type: Number, min: 1, max: 5 },
        rooms: Number,
        amenities: [String],
        website: String,
        logo: String
    },

    // Location
    location: {
        address: { type: String, required: true },
        city: { type: String, default: 'Addis Ababa' },
        region: String,
        country: { type: String, default: 'Ethiopia' },
        zone: { type: Number, min: 1, max: 5 }, // Pricing zone
        coordinates: {
            lat: Number,
            lng: Number
        },
        nearAirport: { type: Boolean, default: false },
        distanceFromAirport: Number // km
    },

    // Contact information
    contacts: {
        primary: {
            name: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String, required: true },
            position: String
        },
        reservations: {
            email: String,
            phone: String
        },
        accounting: {
            name: String,
            email: String,
            phone: String
        }
    },

    // API access
    api: {
        enabled: { type: Boolean, default: false },
        apiKey: String,
        webhookUrl: String,
        allowedIPs: [String],
        sandboxMode: { type: Boolean, default: true }
    },

    // Commission & pricing
    commission: {
        percentage: { type: Number, default: 10 }, // Hotel earns this %
        flatFee: Number, // Or flat fee per booking
        model: {
            type: String,
            enum: ['percentage', 'flat', 'tiered'],
            default: 'percentage'
        },
        tiers: [{
            minBookings: Number,
            percentage: Number
        }]
    },

    // Special pricing for hotel guests
    guestPricing: {
        discountPercentage: { type: Number, default: 0 },
        customRates: [{
            vehicleClass: String,
            rate: Number // Fixed rate for hotel guests
        }],
        includeInRoomCharge: { type: Boolean, default: false }
    },

    // Integration settings
    integration: {
        pmsIntegration: { type: Boolean, default: false },
        pmsType: String, // Opera, Cloudbeds, etc.
        autoConfirm: { type: Boolean, default: false },
        sendGuestNotifications: { type: Boolean, default: true },
        ccHotelOnBookings: { type: Boolean, default: true }
    },

    // Billing
    billing: {
        method: {
            type: String,
            enum: ['monthly_invoice', 'per_booking', 'prepaid'],
            default: 'monthly_invoice'
        },
        currency: { type: String, default: 'USD' },
        paymentTerms: { type: Number, default: 30 },
        bankDetails: {
            bankName: String,
            accountName: String,
            accountNumber: String,
            swiftCode: String
        },
        currentBalance: { type: Number, default: 0 }
    },

    // Statistics
    stats: {
        totalBookings: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        totalCommission: { type: Number, default: 0 },
        averageRating: Number,
        lastBookingDate: Date,
        monthlyBookings: { type: Number, default: 0 }
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'terminated'],
        default: 'pending'
    },

    // Contract
    contract: {
        startDate: Date,
        endDate: Date,
        autoRenew: { type: Boolean, default: true },
        terms: String,
        signedBy: String,
        signedDate: Date,
        documentUrl: String
    },

    // Notes
    notes: String,
    tags: [String]

}, {
    timestamps: true
});

// Indexes
// partnerId already indexed via unique in schema
hotelPartnerSchema.index({ 'hotel.name': 1 });
hotelPartnerSchema.index({ 'api.apiKey': 1 });
hotelPartnerSchema.index({ status: 1 });
hotelPartnerSchema.index({ 'location.zone': 1 });

// Methods
hotelPartnerSchema.methods.generateApiKey = function() {
    this.api.apiKey = `sp_htl_${uuidv4().replace(/-/g, '')}`;
    this.api.enabled = true;
    return this.save();
};

hotelPartnerSchema.methods.calculateCommission = function(bookingAmount) {
    if (this.commission.model === 'flat') {
        return this.commission.flatFee || 0;
    }

    if (this.commission.model === 'tiered' && this.commission.tiers?.length > 0) {
        const tier = this.commission.tiers
            .filter(t => this.stats.monthlyBookings >= t.minBookings)
            .sort((a, b) => b.minBookings - a.minBookings)[0];

        if (tier) {
            return bookingAmount * (tier.percentage / 100);
        }
    }

    return bookingAmount * (this.commission.percentage / 100);
};

hotelPartnerSchema.methods.getGuestDiscount = function(vehicleClass) {
    // Check for custom rate first
    const customRate = this.guestPricing.customRates?.find(
        r => r.vehicleClass === vehicleClass
    );

    if (customRate) {
        return { type: 'fixed', rate: customRate.rate };
    }

    return {
        type: 'percentage',
        discount: this.guestPricing.discountPercentage || 0
    };
};

hotelPartnerSchema.methods.recordBooking = function(amount, commission) {
    this.stats.totalBookings++;
    this.stats.monthlyBookings++;
    this.stats.totalRevenue += amount;
    this.stats.totalCommission += commission;
    this.stats.lastBookingDate = new Date();
    return this.save();
};

// Statics
hotelPartnerSchema.statics.findByApiKey = function(apiKey) {
    return this.findOne({
        'api.apiKey': apiKey,
        'api.enabled': true,
        status: 'active'
    });
};

const HotelPartner = mongoose.model('HotelPartner', hotelPartnerSchema);

module.exports = HotelPartner;
