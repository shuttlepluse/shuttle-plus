// ========================================
// Booking Model
// ========================================

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema({
    bookingReference: {
        type: String,
        unique: true,
        default: () => `SP-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional for guest bookings
    },
    type: {
        type: String,
        enum: ['arrival', 'departure'],
        required: true
    },

    // Flight Information
    flight: {
        number: {
            type: String,
            required: true,
            uppercase: true,
            trim: true
        },
        airline: String,
        scheduledTime: Date,
        actualTime: Date,
        status: {
            type: String,
            enum: ['scheduled', 'delayed', 'landed', 'departed', 'cancelled', 'unknown'],
            default: 'scheduled'
        },
        lastChecked: Date,
        terminal: String,
        gate: String
    },

    // Pickup Details
    pickup: {
        location: {
            type: String,
            required: true
        },
        address: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        scheduledTime: {
            type: Date,
            required: true
        },
        actualTime: Date,
        notes: String
    },

    // Drop-off Details
    dropoff: {
        location: {
            type: String,
            required: true
        },
        address: String,
        zone: {
            type: Number,
            min: 1,
            max: 5
        },
        coordinates: {
            lat: Number,
            lng: Number
        },
        notes: String
    },

    // Vehicle & Passengers
    vehicleClass: {
        type: String,
        enum: ['standard', 'executive', 'suv', 'luxury'],
        default: 'standard'
    },
    passengers: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    luggage: {
        type: Number,
        default: 0,
        min: 0
    },
    specialRequests: String,
    childSeat: {
        type: Boolean,
        default: false
    },

    // Contact Info
    contact: {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        email: String
    },

    // Pricing
    pricing: {
        baseFare: {
            type: Number,
            required: true
        },
        baseFareETB: Number,
        additionalStops: {
            type: Number,
            default: 0
        },
        lateNightSurcharge: {
            type: Number,
            default: 0
        },
        childSeatFee: {
            type: Number,
            default: 0
        },
        discount: {
            type: Number,
            default: 0
        },
        totalUSD: {
            type: Number,
            required: true
        },
        totalETB: Number,
        currency: {
            type: String,
            enum: ['USD', 'ETB'],
            default: 'USD'
        },
        exchangeRate: Number
    },

    // Driver Assignment
    driver: {
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver'
        },
        name: String,
        phone: String,
        photo: String,
        vehiclePlate: String,
        vehicleModel: String,
        vehicleColor: String,
        currentLocation: {
            lat: Number,
            lng: Number
        },
        lastLocationUpdate: Date,
        rating: Number
    },

    // Status Tracking
    status: {
        type: String,
        enum: [
            'pending',
            'confirmed',
            'driver_assigned',
            'driver_enroute',
            'driver_arrived',
            'passenger_picked_up',
            'in_progress',
            'completed',
            'cancelled',
            'no_show'
        ],
        default: 'pending'
    },
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String,
        updatedBy: String
    }],

    // Payment
    payment: {
        method: {
            type: String,
            enum: ['stripe', 'telebirr', 'cash', 'corporate'],
            default: 'cash'
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionId: String,
        paidAt: Date,
        receiptUrl: String
    },

    // Notifications Sent
    notificationsSent: [{
        type: {
            type: String,
            enum: [
                'confirmation',
                'reminder',
                'driver_assigned',
                'driver_enroute',
                'driver_arrived',
                'flight_delay',
                'cancellation',
                'receipt'
            ]
        },
        channel: {
            type: String,
            enum: ['push', 'sms', 'whatsapp', 'email', 'multi']
        },
        sentAt: Date,
        status: {
            type: String,
            enum: ['sent', 'delivered', 'failed']
        },
        messageId: String
    }],

    // Rating
    rating: {
        score: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        ratedAt: Date
    },

    // Corporate
    corporateAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CorporateAccount'
    },
    corporateReference: String,

    // Meta
    source: {
        type: String,
        enum: ['web', 'pwa', 'phone', 'partner'],
        default: 'web'
    },
    ipAddress: String,
    userAgent: String

}, {
    timestamps: true
});

// Indexes - Single field (bookingReference already indexed via unique in schema)
bookingSchema.index({ userId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'pickup.scheduledTime': 1 });
bookingSchema.index({ 'flight.number': 1 });
bookingSchema.index({ 'driver.driverId': 1 });
bookingSchema.index({ createdAt: -1 });

// Compound indexes for common query patterns
bookingSchema.index({ userId: 1, status: 1 }); // User's active bookings
bookingSchema.index({ userId: 1, createdAt: -1 }); // User's recent bookings
bookingSchema.index({ status: 1, 'pickup.scheduledTime': 1 }); // Upcoming bookings by status
bookingSchema.index({ 'driver.driverId': 1, status: 1 }); // Driver's active trips
bookingSchema.index({ 'payment.status': 1, status: 1 }); // Unpaid bookings
bookingSchema.index({ 'flight.number': 1, 'flight.scheduledTime': 1 }); // Flight lookup
bookingSchema.index({ 'payment.transactionId': 1 }); // Payment lookup

// Virtual for checking if booking is upcoming
bookingSchema.virtual('isUpcoming').get(function() {
    return this.pickup.scheduledTime > new Date() &&
           !['completed', 'cancelled', 'no_show'].includes(this.status);
});

// Pre-save hook to add status history
bookingSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });
    }
    next();
});

// Instance methods
bookingSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = 'system') {
    this.status = newStatus;
    this.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note,
        updatedBy
    });
    return this.save();
};

bookingSchema.methods.assignDriver = function(driver, vehicle) {
    this.driver = {
        driverId: driver._id,
        name: driver.name,
        phone: driver.phone,
        photo: driver.photo,
        vehiclePlate: vehicle.plateNumber,
        vehicleModel: `${vehicle.make} ${vehicle.model}`,
        vehicleColor: vehicle.color,
        rating: driver.rating
    };
    return this.updateStatus('driver_assigned', `Driver ${driver.name} assigned`);
};

bookingSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
