// ========================================
// Audit Routes
// ========================================

const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const AuditLog = require('../models/AuditLog');

// Get audit trail with filters
router.get('/trail', async (req, res) => {
    try {
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
        } = req.query;

        const result = await auditService.getAuditTrail({
            startDate,
            endDate,
            eventType,
            category,
            severity,
            actorId,
            resourceId,
            resourceReference,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

        res.json({
            success: true,
            ...result,
            page: Math.floor(result.skip / result.limit) + 1,
            totalPages: Math.ceil(result.total / result.limit)
        });
    } catch (error) {
        console.error('[Audit] Trail error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get audit logs for a specific resource
router.get('/resource/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { limit = 50 } = req.query;

        const logs = await AuditLog.find({
            'resource.type': type,
            $or: [
                { 'resource.id': id },
                { 'resource.reference': id }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get audit logs for a specific actor
router.get('/actor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const logs = await AuditLog.findByActor(id, {
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get security audit report
router.get('/security-report', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const report = await auditService.getSecurityAuditReport(startDate, endDate);

        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get audit event types
router.get('/event-types', (req, res) => {
    const eventTypes = AuditLog.schema.path('eventType').enumValues;
    const categories = AuditLog.schema.path('category').enumValues;
    const severities = AuditLog.schema.path('severity').enumValues;

    res.json({
        success: true,
        eventTypes,
        categories,
        severities
    });
});

// Get audit statistics
router.get('/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const matchStage = {};
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const [byCategoryResult, bySeverityResult, totalResult] = await Promise.all([
            AuditLog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]),
            AuditLog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ]),
            AuditLog.countDocuments(matchStage)
        ]);

        const byCategory = byCategoryResult.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const bySeverity = bySeverityResult.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.json({
            success: true,
            stats: {
                total: totalResult,
                byCategory,
                bySeverity
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get booking audit trail
router.get('/booking/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const logs = await AuditLog.findByBookingReference(reference);

        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
