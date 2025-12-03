// ========================================
// User Model
// ========================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^\+251\d{9}$/, 'Please enter a valid Ethiopian phone number (+251...)']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    name: {
        type: String,
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    preferredLanguage: {
        type: String,
        enum: ['en', 'am'],
        default: 'en'
    },
    notificationPreferences: {
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        email: { type: Boolean, default: false }
    },
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String
        }
    },
    corporateAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CorporateAccount'
    },
    role: {
        type: String,
        enum: ['customer', 'driver', 'admin'],
        default: 'customer'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        code: String,
        expiresAt: Date
    },
    lastLogin: Date,
    totalBookings: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes (phone and email already indexed via unique/sparse in schema)
userSchema.index({ corporateAccountId: 1 });

// Instance methods
userSchema.methods.generateOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    return otp;
};

userSchema.methods.verifyOTP = function(code) {
    if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
        return false;
    }
    if (new Date() > this.otp.expiresAt) {
        return false;
    }
    return this.otp.code === code;
};

userSchema.methods.clearOTP = function() {
    this.otp = undefined;
};

userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.otp;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
