// ========================================
// Notification Routes
// ========================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Validation middleware
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// ========================================
// POST /api/notifications/subscribe - Save push subscription
// ========================================
router.post('/subscribe',
    authenticate,
    [
        body('endpoint').notEmpty().withMessage('Endpoint is required'),
        body('keys.p256dh').notEmpty().withMessage('p256dh key is required'),
        body('keys.auth').notEmpty().withMessage('auth key is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { endpoint, expirationTime, keys } = req.body;

            // Save subscription to user
            req.user.pushSubscription = {
                endpoint,
                expirationTime,
                keys: {
                    p256dh: keys.p256dh,
                    auth: keys.auth
                }
            };

            // Enable push notifications preference
            req.user.notificationPreferences.push = true;

            await req.user.save();

            res.json({
                success: true,
                message: 'Push notifications enabled'
            });

        } catch (error) {
            console.error('Subscribe error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to enable push notifications'
            });
        }
    }
);

// ========================================
// DELETE /api/notifications/subscribe - Remove push subscription
// ========================================
router.delete('/subscribe', authenticate, async (req, res) => {
    try {
        req.user.pushSubscription = undefined;
        req.user.notificationPreferences.push = false;
        await req.user.save();

        res.json({
            success: true,
            message: 'Push notifications disabled'
        });

    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disable push notifications'
        });
    }
});

// ========================================
// POST /api/notifications/test - Send test notification
// ========================================
router.post('/test', authenticate, async (req, res) => {
    try {
        if (!req.user.pushSubscription?.endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Push notifications not enabled'
            });
        }

        await notificationService.sendPushNotification(req.user.pushSubscription, {
            title: 'Test Notification',
            body: 'Push notifications are working! You will receive updates about your bookings here.',
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-96x96.png',
            tag: 'test',
            data: {
                type: 'test',
                url: '/'
            }
        });

        res.json({
            success: true,
            message: 'Test notification sent'
        });

    } catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test notification'
        });
    }
});

// ========================================
// GET /api/notifications/vapid-key - Get VAPID public key
// ========================================
router.get('/vapid-key', (req, res) => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
        return res.status(503).json({
            success: false,
            message: 'Push notifications not configured'
        });
    }

    res.json({
        success: true,
        data: {
            publicKey: vapidPublicKey
        }
    });
});

// ========================================
// GET /api/notifications/preferences - Get notification preferences
// ========================================
router.get('/preferences', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                preferences: req.user.notificationPreferences,
                pushEnabled: !!req.user.pushSubscription?.endpoint
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get preferences'
        });
    }
});

module.exports = router;
