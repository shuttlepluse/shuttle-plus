// ========================================
// Driver Model
// ========================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
    // Account Info
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    phone: {
        type: String,
        required: true
    },

    // Personal Info
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: Date,
    profilePhoto: String,
    languages: [{
        type: String,
        enum: ['amharic', 'english', 'oromo', 'tigrinya', 'arabic', 'french', 'italian']
    }],

    // License & Documents
    license: {
        number: String,
        expiryDate: Date,
        type: {
            type: String,
            enum: ['private', 'commercial', 'public_service']
        },
        verified: {
            type: Boolean,
            default: false
        },
        documentUrl: String
    },
    nationalId: {
        number: String,
        verified: {
            type: Boolean,
            default: false
        },
        documentUrl: String
    },

    // Current Vehicle Assignment
    currentVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'active', 'inactive', 'suspended', 'terminated'],
        default: 'pending'
    },
    onlineStatus: {
        type: String,
        enum: ['online', 'offline', 'busy'],
        default: 'offline'
    },

    // Location (for real-time tracking)
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        },
        lastUpdated: Date,
        heading: Number, // Direction in degrees
        speed: Number // km/h
    },

    // Performance Metrics
    rating: {
        average: {
            type: Number,
            default: 5.0,
            min: 1,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    completedTrips: {
        type: Number,
        default: 0
    },
    cancelledTrips: {
        type: Number,
        default: 0
    },
    acceptanceRate: {
        type: Number,
        default: 100
    },

    // Earnings
    earnings: {
        currentWeek: {
            type: Number,
            default: 0
        },
        currentMonth: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        },
        lastPayout: Date,
        balance: {
            type: Number,
            default: 0
        }
    },

    // Bank Details for Payouts
    bankDetails: {
        bankName: String,
        accountNumber: String,
        accountName: String,
        branchCode: String
    },

    // Notification Preferences
    notificationPreferences: {
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        newBookingAlert: { type: Boolean, default: true }
    },
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String
        }
    },

    // Working Hours
    workingHours: {
        monday: { start: String, end: String, enabled: Boolean },
        tuesday: { start: String, end: String, enabled: Boolean },
        wednesday: { start: String, end: String, enabled: Boolean },
        thursday: { start: String, end: String, enabled: Boolean },
        friday: { start: String, end: String, enabled: Boolean },
        saturday: { start: String, end: String, enabled: Boolean },
        sunday: { start: String, end: String, enabled: Boolean }
    },

    // Emergency Contact
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    },

    // Metadata
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastActiveAt: Date,
    approvedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Notes (for admin)
    adminNotes: [{
        note: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes
// email already indexed via unique in schema
driverSchema.index({ location: '2dsphere' }); // Geospatial index for location queries
driverSchema.index({ status: 1, onlineStatus: 1 });

// Virtual for full name
driverSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for initials
driverSchema.virtual('initials').get(function() {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// Hash password before saving
driverSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
driverSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update rating after new review
driverSchema.methods.updateRating = async function(newRating) {
    const totalRatings = this.rating.count * this.rating.average;
    this.rating.count += 1;
    this.rating.average = (totalRatings + newRating) / this.rating.count;
    this.rating.average = Math.round(this.rating.average * 10) / 10;
    await this.save();
};

// Update location
driverSchema.methods.updateLocation = async function(longitude, latitude, heading, speed) {
    this.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
        lastUpdated: new Date(),
        heading,
        speed
    };
    await this.save();
};

// Find nearby drivers
driverSchema.statics.findNearby = async function(longitude, latitude, maxDistance = 10000) {
    return this.find({
        status: 'active',
        onlineStatus: 'online',
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistance
            }
        }
    }).populate('currentVehicle');
};

// Ensure virtual fields are serialized
driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Driver', driverSchema);
