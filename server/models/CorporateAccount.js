// ========================================
// Corporate Account Model
// ========================================

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const corporateAccountSchema = new mongoose.Schema({
    // Account identification
    accountId: {
        type: String,
        unique: true,
        default: () => `CORP-${uuidv4().substring(0, 8).toUpperCase()}`
    },

    // Company information
    company: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        legalName: String,
        registrationNumber: String,
        taxId: String,
        industry: {
            type: String,
            enum: [
                'hospitality', // Hotels, resorts
                'airline', // Airlines, aviation
                'travel_agency', // Travel agencies, tour operators
                'ngo', // NGOs, international organizations
                'embassy', // Embassies, diplomatic missions
                'corporate', // General corporate
                'government', // Government bodies
                'healthcare', // Hospitals, medical tourism
                'education', // Universities, schools
                'event', // Event management
                'other'
            ],
            default: 'corporate'
        },
        size: {
            type: String,
            enum: ['small', 'medium', 'large', 'enterprise'],
            default: 'small'
        },
        website: String,
        logo: String
    },

    // Contact information
    contact: {
        primary: {
            name: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String, required: true },
            position: String
        },
        billing: {
            name: String,
            email: String,
            phone: String
        },
        operations: {
            name: String,
            email: String,
            phone: String
        }
    },

    // Address
    address: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: {
            type: String,
            default: 'Ethiopia'
        }
    },

    // Pricing tier
    pricingTier: {
        type: String,
        enum: ['standard', 'silver', 'gold', 'platinum', 'custom'],
        default: 'standard'
    },

    // Custom pricing rules
    pricing: {
        discountPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        customRates: [{
            zoneFrom: Number,
            zoneTo: Number,
            vehicleClass: String,
            rate: Number, // Fixed rate in USD
            enabled: { type: Boolean, default: true }
        }],
        volumeDiscounts: [{
            minTrips: Number,
            discountPercentage: Number
        }],
        // Markup for invoicing (if reselling)
        markupPercentage: {
            type: Number,
            default: 0
        },
        // Special rates for specific vehicle types
        vehicleRates: {
            standard: { type: Number, default: 0 }, // Percentage discount
            executive: { type: Number, default: 0 },
            suv: { type: Number, default: 0 },
            luxury: { type: Number, default: 0 }
        }
    },

    // Billing settings
    billing: {
        method: {
            type: String,
            enum: ['prepaid', 'postpaid', 'credit'],
            default: 'prepaid'
        },
        currency: {
            type: String,
            enum: ['USD', 'ETB'],
            default: 'USD'
        },
        paymentTerms: {
            type: Number,
            default: 30 // Days
        },
        creditLimit: {
            type: Number,
            default: 0
        },
        currentBalance: {
            type: Number,
            default: 0
        },
        autoRecharge: {
            enabled: { type: Boolean, default: false },
            threshold: Number,
            amount: Number
        },
        invoiceEmail: String,
        requirePO: { type: Boolean, default: false } // Require purchase order number
    },

    // User access
    users: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        email: String,
        role: {
            type: String,
            enum: ['admin', 'booker', 'viewer'],
            default: 'booker'
        },
        permissions: {
            canBook: { type: Boolean, default: true },
            canViewAllBookings: { type: Boolean, default: false },
            canApproveBookings: { type: Boolean, default: false },
            canManageUsers: { type: Boolean, default: false },
            canViewReports: { type: Boolean, default: false },
            canManageBilling: { type: Boolean, default: false }
        },
        addedAt: { type: Date, default: Date.now },
        addedBy: mongoose.Schema.Types.ObjectId
    }],

    // Booking settings
    bookingSettings: {
        requireApproval: { type: Boolean, default: false },
        approvers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        maxBookingsPerMonth: Number,
        allowedVehicleClasses: [{
            type: String,
            enum: ['standard', 'executive', 'suv', 'luxury']
        }],
        defaultVehicleClass: {
            type: String,
            default: 'standard'
        },
        requireCostCenter: { type: Boolean, default: false },
        costCenters: [{
            code: String,
            name: String,
            budget: Number,
            spent: Number
        }],
        requireProjectCode: { type: Boolean, default: false },
        allowedDestinations: [{
            name: String,
            zone: Number
        }]
    },

    // Reporting settings
    reporting: {
        frequency: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly'],
            default: 'monthly'
        },
        recipients: [String],
        includeDetails: { type: Boolean, default: true },
        format: {
            type: String,
            enum: ['pdf', 'excel', 'both'],
            default: 'both'
        }
    },

    // Statistics
    stats: {
        totalBookings: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        averagePerTrip: { type: Number, default: 0 },
        lastBookingDate: Date,
        monthlyBookings: { type: Number, default: 0 },
        currentMonthSpent: { type: Number, default: 0 }
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'closed'],
        default: 'pending'
    },

    // Contract details
    contract: {
        startDate: Date,
        endDate: Date,
        terms: String,
        signedBy: String,
        signedDate: Date,
        documentUrl: String,
        autoRenew: { type: Boolean, default: true }
    },

    // API access
    apiAccess: {
        enabled: { type: Boolean, default: false },
        apiKey: String,
        webhookUrl: String,
        allowedIPs: [String],
        rateLimit: {
            type: Number,
            default: 100 // Requests per minute
        }
    },

    // Notes and metadata
    notes: String,
    tags: [String],
    salesRep: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Verification
    verified: {
        type: Boolean,
        default: false
    },
    verifiedAt: Date,
    verifiedBy: mongoose.Schema.Types.ObjectId

}, {
    timestamps: true
});

// Indexes
// accountId already indexed via unique in schema
corporateAccountSchema.index({ 'company.name': 1 });
corporateAccountSchema.index({ status: 1 });
corporateAccountSchema.index({ pricingTier: 1 });
corporateAccountSchema.index({ 'users.userId': 1 });
corporateAccountSchema.index({ 'users.email': 1 });

// Virtual for active users count
corporateAccountSchema.virtual('activeUsersCount').get(function () {
    return this.users?.length || 0;
});

// Methods
corporateAccountSchema.methods.calculateDiscount = function (basePrice, vehicleClass = 'standard') {
    let discount = 0;

    // Base tier discount
    discount += this.pricing.discountPercentage || 0;

    // Vehicle-specific discount
    if (this.pricing.vehicleRates && this.pricing.vehicleRates[vehicleClass]) {
        discount += this.pricing.vehicleRates[vehicleClass];
    }

    // Volume discount
    if (this.pricing.volumeDiscounts && this.stats.monthlyBookings > 0) {
        const applicableDiscount = this.pricing.volumeDiscounts
            .filter(vd => this.stats.monthlyBookings >= vd.minTrips)
            .sort((a, b) => b.minTrips - a.minTrips)[0];

        if (applicableDiscount) {
            discount += applicableDiscount.discountPercentage;
        }
    }

    // Cap at 50%
    discount = Math.min(discount, 50);

    return {
        discountPercentage: discount,
        discountAmount: basePrice * (discount / 100),
        finalPrice: basePrice * (1 - discount / 100)
    };
};

corporateAccountSchema.methods.getCustomRate = function (zoneFrom, zoneTo, vehicleClass) {
    if (!this.pricing.customRates || this.pricing.customRates.length === 0) {
        return null;
    }

    const customRate = this.pricing.customRates.find(
        r => r.enabled &&
            r.zoneFrom === zoneFrom &&
            r.zoneTo === zoneTo &&
            r.vehicleClass === vehicleClass
    );

    return customRate?.rate || null;
};

corporateAccountSchema.methods.hasCredit = function (amount) {
    if (this.billing.method === 'prepaid') {
        return this.billing.currentBalance >= amount;
    }
    if (this.billing.method === 'credit') {
        return (this.billing.currentBalance + this.billing.creditLimit) >= amount;
    }
    return true; // Postpaid
};

corporateAccountSchema.methods.deductBalance = function (amount) {
    this.billing.currentBalance -= amount;
    this.stats.totalSpent += amount;
    this.stats.currentMonthSpent += amount;
    return this.save();
};

corporateAccountSchema.methods.addBalance = function (amount) {
    this.billing.currentBalance += amount;
    return this.save();
};

corporateAccountSchema.methods.recordBooking = function (amount) {
    this.stats.totalBookings += 1;
    this.stats.monthlyBookings += 1;
    this.stats.lastBookingDate = new Date();
    this.stats.averagePerTrip = this.stats.totalSpent / this.stats.totalBookings;
    return this.save();
};

corporateAccountSchema.methods.generateApiKey = function () {
    this.apiAccess.apiKey = `sp_corp_${uuidv4().replace(/-/g, '')}`;
    this.apiAccess.enabled = true;
    return this.save();
};

corporateAccountSchema.methods.hasPermission = function (userId, permission) {
    const user = this.users.find(u =>
        u.userId?.toString() === userId?.toString() || u.email === userId
    );

    if (!user) return false;
    if (user.role === 'admin') return true;

    return user.permissions[permission] === true;
};

// Statics
corporateAccountSchema.statics.findByUser = function (userId) {
    return this.findOne({ 'users.userId': userId, status: 'active' });
};

corporateAccountSchema.statics.findByApiKey = function (apiKey) {
    return this.findOne({
        'apiAccess.apiKey': apiKey,
        'apiAccess.enabled': true,
        status: 'active'
    });
};

// Pre-save: Reset monthly stats at month start
corporateAccountSchema.pre('save', function (next) {
    if (this.isNew) {
        this.pricing.discountPercentage = this.getTierDiscount();
    }
    next();
});

// Instance method to get tier discount
corporateAccountSchema.methods.getTierDiscount = function () {
    const tierDiscounts = {
        standard: 0,
        silver: 5,
        gold: 10,
        platinum: 15,
        custom: this.pricing.discountPercentage || 0
    };
    return tierDiscounts[this.pricingTier] || 0;
};

const CorporateAccount = mongoose.model('CorporateAccount', corporateAccountSchema);

module.exports = CorporateAccount;
