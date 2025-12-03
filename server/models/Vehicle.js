// ========================================
// Vehicle Model
// ========================================

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    // Vehicle Information
    make: {
        type: String,
        required: true,
        trim: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        required: true,
        trim: true
    },
    licensePlate: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    // Vehicle Type/Category
    type: {
        type: String,
        enum: ['sedan', 'suv', 'van', 'minibus', 'luxury'],
        default: 'sedan'
    },
    category: {
        type: String,
        enum: ['economy', 'standard', 'premium', 'luxury', 'group'],
        default: 'standard'
    },

    // Capacity
    passengerCapacity: {
        type: Number,
        required: true,
        min: 1,
        max: 15
    },
    luggageCapacity: {
        type: Number,
        default: 2,
        min: 0,
        max: 10
    },

    // Features
    features: {
        airConditioning: { type: Boolean, default: true },
        wifi: { type: Boolean, default: false },
        childSeat: { type: Boolean, default: false },
        wheelchairAccessible: { type: Boolean, default: false },
        phoneCharger: { type: Boolean, default: true },
        waterBottles: { type: Boolean, default: true },
        leatherSeats: { type: Boolean, default: false },
        tintedWindows: { type: Boolean, default: true }
    },

    // Photos
    photos: [{
        url: String,
        type: {
            type: String,
            enum: ['exterior_front', 'exterior_side', 'exterior_back', 'interior', 'dashboard']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Registration & Insurance
    registration: {
        number: String,
        expiryDate: Date,
        documentUrl: String,
        verified: {
            type: Boolean,
            default: false
        }
    },
    insurance: {
        provider: String,
        policyNumber: String,
        expiryDate: Date,
        documentUrl: String,
        verified: {
            type: Boolean,
            default: false
        }
    },
    roadworthiness: {
        certificateNumber: String,
        expiryDate: Date,
        documentUrl: String,
        verified: {
            type: Boolean,
            default: false
        }
    },

    // Ownership
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    ownershipType: {
        type: String,
        enum: ['owned', 'leased', 'company'],
        default: 'owned'
    },

    // Assigned Driver
    assignedDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'active', 'inactive', 'maintenance', 'retired'],
        default: 'pending'
    },

    // Maintenance
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,
    mileage: {
        type: Number,
        default: 0
    },
    maintenanceHistory: [{
        date: Date,
        type: {
            type: String,
            enum: ['oil_change', 'tire_rotation', 'brake_service', 'general_service', 'repair', 'inspection']
        },
        description: String,
        cost: Number,
        mileageAtService: Number,
        performedBy: String
    }],

    // Trip Statistics
    stats: {
        totalTrips: {
            type: Number,
            default: 0
        },
        totalDistance: {
            type: Number,
            default: 0
        },
        totalEarnings: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 5.0
        }
    },

    // Pricing (vehicle-specific adjustments)
    pricingModifier: {
        type: Number,
        default: 1.0, // Multiplier for base rates
        min: 0.5,
        max: 3.0
    },

    // Notes
    notes: String,

    // Verification
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
// licensePlate already indexed via unique in schema
vehicleSchema.index({ status: 1, type: 1 });
vehicleSchema.index({ assignedDriver: 1 });

// Virtual for display name
vehicleSchema.virtual('displayName').get(function() {
    return `${this.year} ${this.make} ${this.model}`;
});

// Virtual for full details
vehicleSchema.virtual('fullDetails').get(function() {
    return `${this.color} ${this.year} ${this.make} ${this.model} (${this.licensePlate})`;
});

// Check if documents are valid
vehicleSchema.methods.isDocumentsValid = function() {
    const now = new Date();
    return (
        this.registration?.verified &&
        this.insurance?.verified &&
        this.registration?.expiryDate > now &&
        this.insurance?.expiryDate > now
    );
};

// Check if maintenance is due
vehicleSchema.methods.isMaintenanceDue = function() {
    if (!this.nextMaintenanceDate) return false;
    return new Date() >= this.nextMaintenanceDate;
};

// Add maintenance record
vehicleSchema.methods.addMaintenanceRecord = async function(record) {
    this.maintenanceHistory.push({
        ...record,
        date: record.date || new Date(),
        mileageAtService: record.mileageAtService || this.mileage
    });
    this.lastMaintenanceDate = record.date || new Date();
    await this.save();
};

// Static method to find available vehicles by type
vehicleSchema.statics.findAvailable = async function(type = null, capacity = 1) {
    const query = {
        status: 'active',
        passengerCapacity: { $gte: capacity }
    };

    if (type) {
        query.type = type;
    }

    return this.find(query).populate('assignedDriver');
};

// Get vehicles needing document renewal
vehicleSchema.statics.getNeedingRenewal = async function(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.find({
        status: 'active',
        $or: [
            { 'registration.expiryDate': { $lte: futureDate } },
            { 'insurance.expiryDate': { $lte: futureDate } },
            { 'roadworthiness.expiryDate': { $lte: futureDate } }
        ]
    });
};

// Ensure virtuals are serialized
vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
