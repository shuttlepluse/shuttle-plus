// ========================================
// Config Routes - Public configuration endpoints
// ========================================

const express = require('express');
const router = express.Router();

// ========================================
// GET /api/config/mapbox - Get Mapbox token
// ========================================
router.get('/mapbox', (req, res) => {
    const token = process.env.MAPBOX_ACCESS_TOKEN;

    if (!token || token === 'your-mapbox-token') {
        return res.status(503).json({
            success: false,
            error: 'Mapbox not configured'
        });
    }

    res.json({
        success: true,
        token: token
    });
});

// ========================================
// GET /api/config/stripe - Get Stripe public key
// ========================================
router.get('/stripe', (req, res) => {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey || publishableKey.startsWith('pk_test_xxx')) {
        return res.status(503).json({
            success: false,
            error: 'Stripe not configured'
        });
    }

    res.json({
        success: true,
        publishableKey: publishableKey
    });
});

// ========================================
// GET /api/config/vapid - Get VAPID public key for push notifications
// ========================================
router.get('/vapid', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey || publicKey === 'your-vapid-public-key') {
        return res.status(503).json({
            success: false,
            error: 'Push notifications not configured'
        });
    }

    res.json({
        success: true,
        publicKey: publicKey
    });
});

// ========================================
// GET /api/config/features - Get enabled features
// ========================================
router.get('/features', (req, res) => {
    res.json({
        success: true,
        features: {
            flightTracking: !!process.env.AVIATIONSTACK_API_KEY,
            mapTracking: !!process.env.MAPBOX_ACCESS_TOKEN,
            stripePayments: !!process.env.STRIPE_SECRET_KEY,
            telebirrPayments: !!process.env.TELEBIRR_APP_ID,
            pushNotifications: !!process.env.VAPID_PUBLIC_KEY,
            smsNotifications: !!process.env.TWILIO_ACCOUNT_SID,
            whatsappNotifications: !!process.env.TWILIO_WHATSAPP_NUMBER
        }
    });
});

module.exports = router;
