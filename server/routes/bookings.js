// ========================================
// Booking Routes
// ========================================

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { authenticate, optionalAuth } = require('../middleware/auth');
const pricingService = require('../services/pricingService');
const notificationService = require('../services/notificationService');
const pdfService = require('../services/pdfService');

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
// POST /api/bookings - Create new booking
// ========================================
router.post('/',
    optionalAuth,
    [
        body('type')
            .isIn(['arrival', 'departure'])
            .withMessage('Type must be arrival or departure'),
        body('flight.number')
            .trim()
            .notEmpty()
            .withMessage('Flight number is required'),
        body('flight.scheduledTime')
            .isISO8601()
            .withMessage('Valid flight time is required'),
        body('pickup.location')
            .trim()
            .notEmpty()
            .withMessage('Pickup location is required'),
        body('pickup.scheduledTime')
            .isISO8601()
            .withMessage('Valid pickup time is required'),
        body('dropoff.location')
            .trim()
            .notEmpty()
            .withMessage('Drop-off location is required'),
        body('vehicleClass')
            .isIn(['standard', 'executive', 'suv', 'luxury'])
            .withMessage('Invalid vehicle class'),
        body('passengers')
            .isInt({ min: 1, max: 10 })
            .withMessage('Passengers must be between 1 and 10'),
        body('contact.name')
            .trim()
            .notEmpty()
            .withMessage('Contact name is required'),
        body('contact.phone')
            .matches(/^\+251\d{9}$/)
            .withMessage('Valid Ethiopian phone number required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const bookingData = req.body;

            // Calculate pricing
            const pricing = await pricingService.calculate({
                pickup: bookingData.pickup.location,
                dropoff: bookingData.dropoff.location,
                vehicleClass: bookingData.vehicleClass,
                pickupTime: bookingData.pickup.scheduledTime
            });

            // Create booking
            const booking = new Booking({
                ...bookingData,
                userId: req.userId || null,
                pricing,
                source: 'pwa',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            await booking.save();

            // Update user's booking count if authenticated
            if (req.userId) {
                await User.findByIdAndUpdate(req.userId, {
                    $inc: { totalBookings: 1 }
                });
            }

            // Send confirmation notification
            await notificationService.sendBookingConfirmation(booking);

            res.status(201).json({
                success: true,
                message: 'Booking created successfully',
                data: booking.toJSON()
            });

        } catch (error) {
            console.error('Create booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create booking'
            });
        }
    }
);

// ========================================
// GET /api/bookings - Get user's bookings
// ========================================
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = { userId: req.userId };
        if (status) {
            query.status = status;
        }

        const bookings = await Booking.find(query)
            .sort({ 'pickup.scheduledTime': -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Booking.countDocuments(query);

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get bookings'
        });
    }
});

// ========================================
// GET /api/bookings/:id - Get single booking
// ========================================
router.get('/:id',
    optionalAuth,
    [
        param('id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Find by ID or booking reference
            const booking = await Booking.findOne({
                $or: [
                    { _id: id },
                    { bookingReference: id.toUpperCase() }
                ]
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Check ownership if authenticated
            if (req.userId && booking.userId &&
                booking.userId.toString() !== req.userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            res.json({
                success: true,
                data: booking.toJSON()
            });

        } catch (error) {
            console.error('Get booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get booking'
            });
        }
    }
);

// ========================================
// PUT /api/bookings/:id - Update booking
// ========================================
router.put('/:id',
    authenticate,
    [
        param('id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            const booking = await Booking.findOne({
                $or: [
                    { _id: id },
                    { bookingReference: id.toUpperCase() }
                ],
                userId: req.userId
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Don't allow updates to completed/cancelled bookings
            if (['completed', 'cancelled'].includes(booking.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update completed or cancelled booking'
                });
            }

            // Apply updates (whitelist allowed fields)
            const allowedUpdates = ['specialRequests', 'childSeat', 'contact'];
            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    booking[key] = updates[key];
                }
            }

            await booking.save();

            res.json({
                success: true,
                message: 'Booking updated successfully',
                data: booking.toJSON()
            });

        } catch (error) {
            console.error('Update booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update booking'
            });
        }
    }
);

// ========================================
// DELETE /api/bookings/:id - Cancel booking
// ========================================
router.delete('/:id',
    authenticate,
    [
        param('id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const booking = await Booking.findOne({
                $or: [
                    { _id: id },
                    { bookingReference: id.toUpperCase() }
                ],
                userId: req.userId
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Check if cancellation is allowed
            if (['completed', 'cancelled', 'in_progress'].includes(booking.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot cancel this booking'
                });
            }

            // Update status
            await booking.updateStatus('cancelled', reason || 'Cancelled by customer', 'customer');

            // Send cancellation notification
            await notificationService.sendCancellationNotification(booking);

            res.json({
                success: true,
                message: 'Booking cancelled successfully',
                data: booking.toJSON()
            });

        } catch (error) {
            console.error('Cancel booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel booking'
            });
        }
    }
);

// ========================================
// GET /api/bookings/:id/tracking - Get driver location
// ========================================
router.get('/:id/tracking',
    optionalAuth,
    [
        param('id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { id } = req.params;

            const booking = await Booking.findOne({
                $or: [
                    { _id: id },
                    { bookingReference: id.toUpperCase() }
                ]
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Only return tracking for active bookings
            if (!['driver_assigned', 'driver_enroute', 'driver_arrived', 'in_progress'].includes(booking.status)) {
                return res.json({
                    success: true,
                    data: {
                        status: booking.status,
                        tracking: null
                    }
                });
            }

            res.json({
                success: true,
                data: {
                    status: booking.status,
                    tracking: {
                        driver: booking.driver,
                        pickup: booking.pickup,
                        dropoff: booking.dropoff,
                        lastUpdate: booking.driver?.lastLocationUpdate
                    }
                }
            });

        } catch (error) {
            console.error('Get tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get tracking data'
            });
        }
    }
);

// ========================================
// POST /api/bookings/:id/rate - Rate booking
// ========================================
router.post('/:id/rate',
    authenticate,
    [
        param('id').notEmpty().withMessage('Booking ID is required'),
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('review')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Review must be 500 characters or less')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { rating, review } = req.body;

            const booking = await Booking.findOne({
                $or: [
                    { _id: id },
                    { bookingReference: id.toUpperCase() }
                ],
                userId: req.userId,
                status: 'completed'
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Completed booking not found'
                });
            }

            if (booking.rating?.score) {
                return res.status(400).json({
                    success: false,
                    message: 'Booking already rated'
                });
            }

            booking.rating = {
                score: rating,
                review,
                ratedAt: new Date()
            };

            await booking.save();

            res.json({
                success: true,
                message: 'Thank you for your feedback!',
                data: {
                    rating: booking.rating
                }
            });

        } catch (error) {
            console.error('Rate booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit rating'
            });
        }
    }
);

// ========================================
// GET /api/bookings/:id/ticket - Download PDF ticket
// ========================================
router.get('/:id/ticket',
    optionalAuth,
    [
        param('id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { id } = req.params;

            const booking = await Booking.findOne({
                $or: [
                    { _id: id },
                    { bookingReference: id.toUpperCase() }
                ]
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Generate PDF
            const pdfBuffer = await pdfService.generateTicketPDF(booking);

            // Set response headers for PDF download
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="ShuttlePlus-Ticket-${booking.bookingReference}.pdf"`,
                'Content-Length': pdfBuffer.length
            });

            res.send(pdfBuffer);

        } catch (error) {
            console.error('Generate ticket error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate ticket'
            });
        }
    }
);

// ========================================
// GET /api/bookings/:id/receipt - Download PDF receipt
// ========================================
router.get('/:id/receipt',
    optionalAuth,
    [
        param('id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { id } = req.params;

            const booking = await Booking.findOne({
                $or: [
                    { _id: id },
                    { bookingReference: id.toUpperCase() }
                ]
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Only allow receipt download for paid bookings
            if (booking.payment?.status !== 'paid') {
                return res.status(400).json({
                    success: false,
                    message: 'Receipt only available for paid bookings'
                });
            }

            // Generate receipt PDF
            const pdfBuffer = await pdfService.generateReceiptPDF(booking);

            // Set response headers
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="ShuttlePlus-Receipt-${booking.bookingReference}.pdf"`,
                'Content-Length': pdfBuffer.length
            });

            res.send(pdfBuffer);

        } catch (error) {
            console.error('Generate receipt error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate receipt'
            });
        }
    }
);

module.exports = router;
