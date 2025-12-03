// ========================================
// Audit Log Model
// ========================================

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Event identification
    eventId: {
        type: String,
        unique: true,
        default: () => `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    },

    // Event type (indexed via compound index below)
    eventType: {
        type: String,
        enum: [
            // Authentication events
            'auth.login',
            'auth.logout',
            'auth.failed_login',
            'auth.password_change',
            'auth.password_reset',
            'auth.token_refresh',
            'auth.2fa_enabled',
            'auth.2fa_disabled',

            // User events
            'user.created',
            'user.updated',
            'user.deleted',
            'user.role_changed',
            'user.permissions_changed',

            // Booking events
            'booking.created',
            'booking.updated',
            'booking.cancelled',
            'booking.status_changed',
            'booking.driver_assigned',
            'booking.completed',

            // Payment events
            'payment.initiated',
            'payment.completed',
            'payment.failed',
            'payment.refunded',

            // Driver events
            'driver.created',
            'driver.updated',
            'driver.status_changed',
            'driver.location_updated',
            'driver.trip_started',
            'driver.trip_completed',

            // Corporate events
            'corporate.created',
            'corporate.approved',
            'corporate.updated',
            'corporate.suspended',
            'corporate.user_added',
            'corporate.user_removed',

            // Admin events
            'admin.settings_changed',
            'admin.pricing_updated',
            'admin.user_impersonation',
            'admin.data_export',
            'admin.data_delete',

            // System events
            'system.startup',
            'system.shutdown',
            'system.error',
            'system.config_changed',

            // API events
            'api.rate_limit_exceeded',
            'api.key_created',
            'api.key_revoked',

            // Other
            'other'
        ],
        required: true
    },

    // Event category for grouping (indexed via compound index below)
    category: {
        type: String,
        enum: ['auth', 'user', 'booking', 'payment', 'driver', 'corporate', 'admin', 'system', 'api', 'other'],
        required: true
    },

    // Severity level (indexed via compound index below)
    severity: {
        type: String,
        enum: ['debug', 'info', 'warning', 'error', 'critical'],
        default: 'info'
    },

    // Actor (who performed the action)
    actor: {
        type: {
            type: String,
            enum: ['user', 'admin', 'driver', 'system', 'api', 'webhook', 'anonymous'],
            required: true
        },
        id: mongoose.Schema.Types.ObjectId,
        email: String,
        name: String,
        role: String,
        ip: String,
        userAgent: String
    },

    // Target resource
    resource: {
        type: {
            type: String,
            enum: ['user', 'booking', 'payment', 'driver', 'vehicle', 'corporate', 'config', 'other']
        },
        id: mongoose.Schema.Types.ObjectId,
        reference: String, // Booking reference, etc.
        name: String
    },

    // Action details
    action: {
        type: String,
        required: true
    },
    description: String,

    // Changes (for update operations)
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
        fields: [String] // List of changed fields
    },

    // Request metadata
    request: {
        method: String,
        path: String,
        query: mongoose.Schema.Types.Mixed,
        body: mongoose.Schema.Types.Mixed, // Sanitized - no passwords
        headers: mongoose.Schema.Types.Mixed
    },

    // Response metadata
    response: {
        statusCode: Number,
        success: Boolean,
        error: String
    },

    // Location info
    location: {
        country: String,
        region: String,
        city: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },

    // Additional metadata
    metadata: mongoose.Schema.Types.Mixed,

    // Tags for filtering
    tags: [String],

    // Retention (TTL index defined below for auto-cleanup)
    expiresAt: {
        type: Date
    }

}, {
    timestamps: true
});

// Indexes for common queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'actor.id': 1, createdAt: -1 });
auditLogSchema.index({ 'actor.email': 1 });
auditLogSchema.index({ 'resource.id': 1, createdAt: -1 });
auditLogSchema.index({ 'resource.reference': 1 });
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, severity: 1, createdAt: -1 });

// TTL index for automatic cleanup (default 90 days)
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save: Set category from eventType
auditLogSchema.pre('save', function(next) {
    if (!this.category && this.eventType) {
        this.category = this.eventType.split('.')[0];
    }

    // Set default expiration (90 days)
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }

    next();
});

// Static methods
auditLogSchema.statics.log = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('[AuditLog] Failed to save:', error);
        return null;
    }
};

auditLogSchema.statics.findByActor = function(actorId, options = {}) {
    const query = { 'actor.id': actorId };
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0);
};

auditLogSchema.statics.findByResource = function(resourceId, options = {}) {
    const query = { 'resource.id': resourceId };
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0);
};

auditLogSchema.statics.findByBookingReference = function(reference) {
    return this.find({ 'resource.reference': reference })
        .sort({ createdAt: -1 });
};

auditLogSchema.statics.getSecurityEvents = function(startDate, endDate) {
    const securityEvents = [
        'auth.failed_login',
        'auth.password_change',
        'auth.password_reset',
        'user.permissions_changed',
        'admin.user_impersonation',
        'api.rate_limit_exceeded'
    ];

    return this.find({
        eventType: { $in: securityEvents },
        createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
