// ========================================
// Group Booking Model
// ========================================

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const groupBookingSchema = new mongoose.Schema({
    // Group identification
    groupReference: {
        type: String,
        unique: true,
        default: () => `GRP-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`
    },

    // Organizer
    organizer: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        company: String
    },

    // Group details
    groupName: {
        type: String,
        required: true
    },
    groupType: {
        type: String,
        enum: ['corporate', 'wedding', 'conference', 'tour', 'family', 'sports_team', 'other'],
        default: 'other'
    },
    description: String,

    // Event details (if applicable)
    event: {
        name: String,
        date: Date,
        venue: String,
        notes: String
    },

    // Shared trip details
    sharedDetails: {
        type: {
            type: String,
            enum: ['arrival', 'departure', 'both'],
            required: true
        },
        flight: {
            number: String,
            airline: String,
            scheduledTime: Date
        },
        pickup: {
            location: String,
            address: String,
            scheduledTime: Date,
            notes: String
        },
        dropoff: {
            location: String,
            address: String,
            notes: String
        }
    },

    // Individual bookings in the group
    bookings: [{
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking'
        },
        bookingReference: String,
        passengerName: String,
        passengerEmail: String,
        passengerPhone: String,
        passengers: Number,
        luggage: Number,
        vehicleClass: String,
        specialRequests: String,
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled'],
            default: 'pending'
        },
        pricing: {
            basePrice: Number,
            discount: Number,
            finalPrice: Number
        }
    }],

    // Vehicle allocation
    vehicleAllocation: [{
        vehicleClass: String,
        quantity: Number,
        assignedBookings: [mongoose.Schema.Types.ObjectId]
    }],

    // Pricing
    pricing: {
        strategy: {
            type: String,
            enum: ['individual', 'shared', 'flat_rate'],
            default: 'shared'
        },
        baseTotal: Number,
        groupDiscount: {
            type: Number,
            default: 0
        },
        discountPercentage: {
            type: Number,
            default: 0
        },
        finalTotal: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        perPersonPrice: Number,
        depositRequired: Number,
        depositPaid: {
            type: Boolean,
            default: false
        }
    },

    // Payment
    payment: {
        method: {
            type: String,
            enum: ['single', 'split', 'corporate'],
            default: 'single'
        },
        status: {
            type: String,
            enum: ['pending', 'partial', 'paid', 'refunded'],
            default: 'pending'
        },
        transactions: [{
            amount: Number,
            method: String,
            transactionId: String,
            paidBy: String,
            paidAt: Date,
            status: String
        }],
        totalPaid: {
            type: Number,
            default: 0
        },
        remainingBalance: Number
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        default: 'draft'
    },

    // Corporate account link
    corporateAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CorporateAccount'
    },

    // Communication
    communications: [{
        type: {
            type: String,
            enum: ['email', 'sms', 'call', 'note']
        },
        subject: String,
        message: String,
        sentTo: [String],
        sentAt: Date,
        sentBy: mongoose.Schema.Types.ObjectId
    }],

    // Documents
    documents: [{
        name: String,
        type: String,
        url: String,
        uploadedAt: Date
    }],

    // Metadata
    source: {
        type: String,
        enum: ['web', 'phone', 'email', 'partner', 'corporate_portal'],
        default: 'web'
    },
    tags: [String],
    notes: String,

    // Approval
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date

}, {
    timestamps: true
});

// Indexes
// groupReference already indexed via unique in schema
groupBookingSchema.index({ 'organizer.email': 1 });
groupBookingSchema.index({ status: 1 });
groupBookingSchema.index({ 'sharedDetails.pickup.scheduledTime': 1 });
groupBookingSchema.index({ corporateAccountId: 1 });
groupBookingSchema.index({ createdAt: -1 });

// Virtuals
groupBookingSchema.virtual('totalPassengers').get(function() {
    return this.bookings.reduce((sum, b) => sum + (b.passengers || 1), 0);
});

groupBookingSchema.virtual('totalBookings').get(function() {
    return this.bookings.length;
});

groupBookingSchema.virtual('confirmedBookings').get(function() {
    return this.bookings.filter(b => b.status === 'confirmed').length;
});

// Methods
groupBookingSchema.methods.calculateGroupDiscount = function() {
    const bookingCount = this.bookings.length;
    let discountPercentage = 0;

    // Group discount tiers
    if (bookingCount >= 20) {
        discountPercentage = 20;
    } else if (bookingCount >= 10) {
        discountPercentage = 15;
    } else if (bookingCount >= 5) {
        discountPercentage = 10;
    } else if (bookingCount >= 3) {
        discountPercentage = 5;
    }

    return discountPercentage;
};

groupBookingSchema.methods.recalculatePricing = function() {
    const baseTotal = this.bookings.reduce((sum, b) => sum + (b.pricing?.basePrice || 0), 0);
    const discountPercentage = this.calculateGroupDiscount();
    const discountAmount = baseTotal * (discountPercentage / 100);
    const finalTotal = baseTotal - discountAmount;
    const perPersonPrice = this.totalPassengers > 0 ? finalTotal / this.totalPassengers : 0;

    this.pricing.baseTotal = baseTotal;
    this.pricing.discountPercentage = discountPercentage;
    this.pricing.groupDiscount = discountAmount;
    this.pricing.finalTotal = Math.round(finalTotal * 100) / 100;
    this.pricing.perPersonPrice = Math.round(perPersonPrice * 100) / 100;
    this.pricing.depositRequired = Math.round(finalTotal * 0.3 * 100) / 100; // 30% deposit
    this.payment.remainingBalance = finalTotal - this.payment.totalPaid;

    return this.pricing;
};

groupBookingSchema.methods.addBooking = function(bookingData) {
    this.bookings.push(bookingData);
    this.recalculatePricing();
    return this;
};

groupBookingSchema.methods.removeBooking = function(bookingId) {
    this.bookings = this.bookings.filter(b =>
        b.bookingId?.toString() !== bookingId.toString() &&
        b._id?.toString() !== bookingId.toString()
    );
    this.recalculatePricing();
    return this;
};

groupBookingSchema.methods.confirmAll = async function() {
    this.bookings.forEach(b => {
        if (b.status === 'pending') {
            b.status = 'confirmed';
        }
    });
    this.status = 'confirmed';
    return this.save();
};

groupBookingSchema.methods.addPayment = function(paymentData) {
    this.payment.transactions.push({
        ...paymentData,
        paidAt: new Date()
    });
    this.payment.totalPaid += paymentData.amount;
    this.payment.remainingBalance = this.pricing.finalTotal - this.payment.totalPaid;

    if (this.payment.remainingBalance <= 0) {
        this.payment.status = 'paid';
    } else if (this.payment.totalPaid > 0) {
        this.payment.status = 'partial';
    }

    if (this.payment.totalPaid >= this.pricing.depositRequired) {
        this.pricing.depositPaid = true;
    }

    return this;
};

// Pre-save
groupBookingSchema.pre('save', function(next) {
    if (this.isModified('bookings')) {
        this.recalculatePricing();
    }
    next();
});

const GroupBooking = mongoose.model('GroupBooking', groupBookingSchema);

module.exports = GroupBooking;
