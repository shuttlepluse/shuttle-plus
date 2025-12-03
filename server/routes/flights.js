// ========================================
// Flight Routes
// ========================================

const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const aviationService = require('../services/aviationService');
const { flightLimiter } = require('../middleware/rateLimit');

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
// GET /api/flights/:flightNumber - Get flight info
// ========================================
router.get('/:flightNumber',
    flightLimiter,
    [
        param('flightNumber')
            .trim()
            .matches(/^[A-Za-z]{2}\s?\d{1,4}$/)
            .withMessage('Invalid flight number format (e.g., ET 500, LH590)')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { flightNumber } = req.params;

            // Normalize flight number (remove spaces, uppercase)
            const normalizedFlight = flightNumber.replace(/\s/g, '').toUpperCase();

            const flightData = await aviationService.getFlightInfo(normalizedFlight);

            if (!flightData) {
                return res.status(404).json({
                    success: false,
                    message: 'Flight not found. Please check the flight number.'
                });
            }

            res.json({
                success: true,
                data: flightData
            });

        } catch (error) {
            console.error('Flight lookup error:', error);

            if (error.message === 'RATE_LIMIT_EXCEEDED') {
                return res.status(429).json({
                    success: false,
                    message: 'Flight lookup limit reached. Please try again later.'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to get flight information'
            });
        }
    }
);

// ========================================
// GET /api/flights/:flightNumber/status - Get live status
// ========================================
router.get('/:flightNumber/status',
    flightLimiter,
    [
        param('flightNumber')
            .trim()
            .matches(/^[A-Za-z]{2}\s?\d{1,4}$/)
            .withMessage('Invalid flight number format')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { flightNumber } = req.params;
            const normalizedFlight = flightNumber.replace(/\s/g, '').toUpperCase();

            const status = await aviationService.getFlightStatus(normalizedFlight);

            if (!status) {
                return res.status(404).json({
                    success: false,
                    message: 'Flight status not available'
                });
            }

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            console.error('Flight status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get flight status'
            });
        }
    }
);

// ========================================
// GET /api/flights/airlines - Get supported airlines
// ========================================
router.get('/info/airlines', async (req, res) => {
    try {
        // Common airlines flying to Addis Ababa
        const airlines = [
            { code: 'ET', name: 'Ethiopian Airlines', country: 'Ethiopia' },
            { code: 'LH', name: 'Lufthansa', country: 'Germany' },
            { code: 'TK', name: 'Turkish Airlines', country: 'Turkey' },
            { code: 'EK', name: 'Emirates', country: 'UAE' },
            { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
            { code: 'KQ', name: 'Kenya Airways', country: 'Kenya' },
            { code: 'MS', name: 'EgyptAir', country: 'Egypt' },
            { code: 'SA', name: 'South African Airways', country: 'South Africa' },
            { code: 'W3', name: 'Arik Air', country: 'Nigeria' },
            { code: 'RJ', name: 'Royal Jordanian', country: 'Jordan' }
        ];

        res.json({
            success: true,
            data: airlines
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get airlines'
        });
    }
});

module.exports = router;
