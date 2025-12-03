// ========================================
// Pricing Routes
// ========================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pricingService = require('../services/pricingService');

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
// POST /api/pricing/calculate - Calculate fare
// ========================================
router.post('/calculate',
    [
        body('pickup')
            .trim()
            .notEmpty()
            .withMessage('Pickup location is required'),
        body('dropoff')
            .trim()
            .notEmpty()
            .withMessage('Drop-off location is required'),
        body('vehicleClass')
            .isIn(['standard', 'executive', 'suv', 'luxury'])
            .withMessage('Invalid vehicle class'),
        body('pickupTime')
            .optional()
            .isISO8601()
            .withMessage('Invalid pickup time format')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { pickup, dropoff, vehicleClass, pickupTime } = req.body;

            const pricing = await pricingService.calculate({
                pickup,
                dropoff,
                vehicleClass,
                pickupTime
            });

            res.json({
                success: true,
                data: pricing
            });

        } catch (error) {
            console.error('Pricing calculation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to calculate price'
            });
        }
    }
);

// ========================================
// GET /api/pricing/zones - Get zone definitions
// ========================================
router.get('/zones', (req, res) => {
    try {
        const zones = pricingService.getZones();
        res.json({
            success: true,
            data: zones
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get zones'
        });
    }
});

// ========================================
// GET /api/pricing/vehicles - Get vehicle classes with base prices
// ========================================
router.get('/vehicles', (req, res) => {
    try {
        const vehicles = pricingService.getVehicleClasses();
        res.json({
            success: true,
            data: vehicles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get vehicle classes'
        });
    }
});

// ========================================
// GET /api/pricing/destinations - Get common destinations with prices
// ========================================
router.get('/destinations', (req, res) => {
    try {
        const destinations = pricingService.getDestinations();
        res.json({
            success: true,
            data: destinations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get destinations'
        });
    }
});

module.exports = router;
