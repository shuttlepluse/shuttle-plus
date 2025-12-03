// ========================================
// Audit Service
// ========================================

const AuditLog = require('../models/AuditLog');

// Fields to never log (sensitive data)
const SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'token',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'ssn',
    'pin'
];

class AuditService {
    /**
     * Log an event
     */
    async log(options) {
        const {
            eventType,
            action,
            description,
            actor = {},
            resource = {},
            changes = {},
            request = {},
            response = {},
            metadata = {},
            severity = 'info',
            tags = []
        } = options;

        try {
            // Sanitize sensitive data
            const sanitizedRequest = this.sanitizeData(request);
            const sanitizedChanges = {
                before: this.sanitizeData(changes.before),
                after: this.sanitizeData(changes.after),
                fields: changes.fields
            };

            const logEntry = await AuditLog.log({
                eventType,
                action,
                description,
                actor: {
                    type: actor.type || 'system',
                    id: actor.id,
                    email: actor.email,
                    name: actor.name,
                    role: actor.role,
                    ip: actor.ip,
                    userAgent: actor.userAgent
                },
                resource: {
                    type: resource.type,
                    id: resource.id,
                    reference: resource.reference,
                    name: resource.name
                },
                changes: sanitizedChanges,
                request: sanitizedRequest,
                response,
                metadata,
                severity,
                tags
            });

            return logEntry;
        } catch (error) {
            console.error('[Audit] Log failed:', error);
            return null;
        }
    }

    /**
     * Sanitize data by removing sensitive fields
     */
    sanitizeData(data) {
        if (!data || typeof data !== 'object') return data;

        const sanitized = Array.isArray(data) ? [...data] : { ...data };

        for (const key of Object.keys(sanitized)) {
            const lowerKey = key.toLowerCase();

            if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeData(sanitized[key]);
            }
        }

        return sanitized;
    }

    // ========================================
    // Authentication Events
    // ========================================

    async logLogin(user, req, success = true) {
        return this.log({
            eventType: success ? 'auth.login' : 'auth.failed_login',
            action: success ? 'User logged in' : 'Failed login attempt',
            severity: success ? 'info' : 'warning',
            actor: {
                type: 'user',
                id: user?._id,
                email: user?.email || req.body?.email,
                name: user?.name,
                ip: this.getClientIP(req),
                userAgent: req.headers?.['user-agent']
            },
            request: {
                method: req.method,
                path: req.originalUrl
            },
            response: {
                success
            }
        });
    }

    async logLogout(user, req) {
        return this.log({
            eventType: 'auth.logout',
            action: 'User logged out',
            actor: {
                type: 'user',
                id: user._id,
                email: user.email,
                name: user.name,
                ip: this.getClientIP(req),
                userAgent: req.headers?.['user-agent']
            }
        });
    }

    async logPasswordChange(user, req, changedBy = null) {
        return this.log({
            eventType: 'auth.password_change',
            action: 'Password changed',
            severity: 'warning',
            actor: changedBy ? {
                type: 'admin',
                id: changedBy._id,
                email: changedBy.email,
                ip: this.getClientIP(req)
            } : {
                type: 'user',
                id: user._id,
                email: user.email,
                ip: this.getClientIP(req)
            },
            resource: {
                type: 'user',
                id: user._id,
                name: user.name
            }
        });
    }

    // ========================================
    // Booking Events
    // ========================================

    async logBookingCreated(booking, user, req) {
        return this.log({
            eventType: 'booking.created',
            action: 'Booking created',
            description: `New booking ${booking.bookingReference} created`,
            actor: {
                type: user ? 'user' : 'anonymous',
                id: user?._id,
                email: user?.email || booking.contact?.email,
                ip: this.getClientIP(req)
            },
            resource: {
                type: 'booking',
                id: booking._id,
                reference: booking.bookingReference
            },
            metadata: {
                type: booking.type,
                vehicleClass: booking.vehicleClass,
                totalUSD: booking.pricing?.totalUSD
            }
        });
    }

    async logBookingStatusChange(booking, oldStatus, newStatus, updatedBy, req) {
        return this.log({
            eventType: 'booking.status_changed',
            action: `Booking status changed: ${oldStatus} → ${newStatus}`,
            actor: {
                type: updatedBy?.role === 'admin' ? 'admin' : (updatedBy?.role === 'driver' ? 'driver' : 'system'),
                id: updatedBy?._id,
                email: updatedBy?.email,
                ip: req ? this.getClientIP(req) : null
            },
            resource: {
                type: 'booking',
                id: booking._id,
                reference: booking.bookingReference
            },
            changes: {
                before: { status: oldStatus },
                after: { status: newStatus },
                fields: ['status']
            }
        });
    }

    async logDriverAssigned(booking, driver, assignedBy) {
        return this.log({
            eventType: 'booking.driver_assigned',
            action: `Driver ${driver.name} assigned to booking`,
            actor: {
                type: assignedBy ? 'admin' : 'system',
                id: assignedBy?._id,
                email: assignedBy?.email
            },
            resource: {
                type: 'booking',
                id: booking._id,
                reference: booking.bookingReference
            },
            metadata: {
                driverId: driver._id,
                driverName: driver.name
            }
        });
    }

    async logBookingCancelled(booking, cancelledBy, reason, req) {
        return this.log({
            eventType: 'booking.cancelled',
            action: 'Booking cancelled',
            severity: 'warning',
            actor: {
                type: cancelledBy?.role || 'user',
                id: cancelledBy?._id,
                email: cancelledBy?.email,
                ip: req ? this.getClientIP(req) : null
            },
            resource: {
                type: 'booking',
                id: booking._id,
                reference: booking.bookingReference
            },
            metadata: {
                reason,
                totalUSD: booking.pricing?.totalUSD
            }
        });
    }

    // ========================================
    // Payment Events
    // ========================================

    async logPaymentInitiated(booking, paymentMethod, amount, req) {
        return this.log({
            eventType: 'payment.initiated',
            action: `Payment initiated via ${paymentMethod}`,
            actor: {
                type: 'user',
                ip: this.getClientIP(req)
            },
            resource: {
                type: 'payment',
                reference: booking.bookingReference
            },
            metadata: {
                method: paymentMethod,
                amount,
                currency: 'USD'
            }
        });
    }

    async logPaymentCompleted(booking, transactionId, amount) {
        return this.log({
            eventType: 'payment.completed',
            action: 'Payment completed successfully',
            resource: {
                type: 'payment',
                id: transactionId,
                reference: booking.bookingReference
            },
            metadata: {
                transactionId,
                amount,
                method: booking.payment?.method
            }
        });
    }

    async logPaymentFailed(booking, error, req) {
        return this.log({
            eventType: 'payment.failed',
            action: 'Payment failed',
            severity: 'error',
            actor: {
                type: 'user',
                ip: this.getClientIP(req)
            },
            resource: {
                type: 'payment',
                reference: booking.bookingReference
            },
            response: {
                success: false,
                error: error.message || error
            }
        });
    }

    async logRefund(booking, amount, refundedBy) {
        return this.log({
            eventType: 'payment.refunded',
            action: `Refund of $${amount} processed`,
            severity: 'warning',
            actor: {
                type: refundedBy ? 'admin' : 'system',
                id: refundedBy?._id,
                email: refundedBy?.email
            },
            resource: {
                type: 'payment',
                reference: booking.bookingReference
            },
            metadata: {
                amount,
                originalAmount: booking.pricing?.totalUSD
            }
        });
    }

    // ========================================
    // User Events
    // ========================================

    async logUserCreated(user, createdBy, req) {
        return this.log({
            eventType: 'user.created',
            action: 'User account created',
            actor: createdBy ? {
                type: 'admin',
                id: createdBy._id,
                email: createdBy.email
            } : {
                type: 'user',
                ip: this.getClientIP(req)
            },
            resource: {
                type: 'user',
                id: user._id,
                name: user.name
            }
        });
    }

    async logUserUpdated(user, changes, updatedBy, req) {
        return this.log({
            eventType: 'user.updated',
            action: 'User profile updated',
            actor: {
                type: updatedBy?._id?.toString() === user._id?.toString() ? 'user' : 'admin',
                id: updatedBy?._id,
                email: updatedBy?.email,
                ip: this.getClientIP(req)
            },
            resource: {
                type: 'user',
                id: user._id,
                name: user.name
            },
            changes: {
                fields: Object.keys(changes)
            }
        });
    }

    async logRoleChange(user, oldRole, newRole, changedBy) {
        return this.log({
            eventType: 'user.role_changed',
            action: `User role changed: ${oldRole} → ${newRole}`,
            severity: 'warning',
            actor: {
                type: 'admin',
                id: changedBy._id,
                email: changedBy.email
            },
            resource: {
                type: 'user',
                id: user._id,
                name: user.name
            },
            changes: {
                before: { role: oldRole },
                after: { role: newRole },
                fields: ['role']
            }
        });
    }

    // ========================================
    // Admin Events
    // ========================================

    async logAdminAction(admin, action, details, req) {
        return this.log({
            eventType: 'admin.settings_changed',
            action,
            severity: 'warning',
            actor: {
                type: 'admin',
                id: admin._id,
                email: admin.email,
                ip: this.getClientIP(req)
            },
            metadata: details
        });
    }

    async logDataExport(admin, exportType, recordCount, req) {
        return this.log({
            eventType: 'admin.data_export',
            action: `Data exported: ${exportType}`,
            severity: 'warning',
            actor: {
                type: 'admin',
                id: admin._id,
                email: admin.email,
                ip: this.getClientIP(req)
            },
            metadata: {
                exportType,
                recordCount
            }
        });
    }

    // ========================================
    // API Events
    // ========================================

    async logRateLimitExceeded(req) {
        return this.log({
            eventType: 'api.rate_limit_exceeded',
            action: 'Rate limit exceeded',
            severity: 'warning',
            actor: {
                type: 'api',
                ip: this.getClientIP(req),
                userAgent: req.headers?.['user-agent']
            },
            request: {
                method: req.method,
                path: req.originalUrl
            }
        });
    }

    // ========================================
    // System Events
    // ========================================

    async logSystemError(error, context = {}) {
        return this.log({
            eventType: 'system.error',
            action: 'System error occurred',
            severity: 'error',
            actor: { type: 'system' },
            response: {
                success: false,
                error: error.message || error
            },
            metadata: {
                stack: error.stack,
                ...context
            }
        });
    }

    // ========================================
    // Query Methods
    // ========================================

    async getAuditTrail(options = {}) {
        const {
            startDate,
            endDate,
            eventType,
            category,
            severity,
            actorId,
            resourceId,
            resourceReference,
            limit = 100,
            skip = 0
        } = options;

        const query = {};

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (eventType) query.eventType = eventType;
        if (category) query.category = category;
        if (severity) query.severity = severity;
        if (actorId) query['actor.id'] = actorId;
        if (resourceId) query['resource.id'] = resourceId;
        if (resourceReference) query['resource.reference'] = resourceReference;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip),
            AuditLog.countDocuments(query)
        ]);

        return { logs, total, limit, skip };
    }

    async getSecurityAuditReport(startDate, endDate) {
        const logs = await AuditLog.getSecurityEvents(
            new Date(startDate),
            new Date(endDate)
        );

        const summary = {
            failedLogins: 0,
            passwordChanges: 0,
            permissionChanges: 0,
            rateLimitExceeded: 0,
            totalSecurityEvents: logs.length
        };

        logs.forEach(log => {
            switch (log.eventType) {
                case 'auth.failed_login':
                    summary.failedLogins++;
                    break;
                case 'auth.password_change':
                case 'auth.password_reset':
                    summary.passwordChanges++;
                    break;
                case 'user.permissions_changed':
                case 'user.role_changed':
                    summary.permissionChanges++;
                    break;
                case 'api.rate_limit_exceeded':
                    summary.rateLimitExceeded++;
                    break;
            }
        });

        return { summary, logs };
    }

    // ========================================
    // Helper Methods
    // ========================================

    getClientIP(req) {
        if (!req) return null;
        return req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers?.['x-real-ip'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.ip;
    }
}

module.exports = new AuditService();
