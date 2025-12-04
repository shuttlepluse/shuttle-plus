// ========================================
// Admin Routes - Dashboard & Management
// ========================================

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

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

// Simple admin auth for demo (checks header or uses demo credentials)
const simpleAdminAuth = (req, res, next) => {
    // Check for admin token in header
    const adminToken = req.headers['x-admin-token'];

    // Demo admin credentials check
    if (adminToken === 'shuttle-admin-2025' || adminToken === process.env.ADMIN_TOKEN) {
        req.isAdmin = true;
        return next();
    }

    // Check for authenticated user with admin role
    if (req.user && req.user.role === 'admin') {
        req.isAdmin = true;
        return next();
    }

    // For development/demo, allow access with query param
    if (process.env.NODE_ENV !== 'production' && req.query.admin === 'true') {
        req.isAdmin = true;
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Admin access required'
    });
};

// ========================================
// GET /api/admin/bookings - Get ALL bookings
// ========================================
router.get('/bookings',
    simpleAdminAuth,
    async (req, res) => {
        try {
            const {
                status,
                date,
                page = 1,
                limit = 50,
                sort = '-createdAt'
            } = req.query;

            // Build query - NO userId filter (admin sees all)
            const query = {};

            if (status) {
                query.status = status;
            }

            if (date === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                query['pickup.scheduledTime'] = { $gte: today, $lt: tomorrow };
            } else if (date === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const dayAfter = new Date(tomorrow);
                dayAfter.setDate(dayAfter.getDate() + 1);
                query['pickup.scheduledTime'] = { $gte: tomorrow, $lt: dayAfter };
            } else if (date === 'week') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                query['pickup.scheduledTime'] = { $gte: today, $lt: nextWeek };
            }

            const bookings = await Booking.find(query)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const total = await Booking.countDocuments(query);

            res.json({
                success: true,
                data: bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Admin get bookings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get bookings'
            });
        }
    }
);

// ========================================
// GET /api/admin/bookings/:id - Get single booking
// ========================================
router.get('/bookings/:id',
    simpleAdminAuth,
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

            res.json({
                success: true,
                data: booking
            });

        } catch (error) {
            console.error('Admin get booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get booking'
            });
        }
    }
);

// ========================================
// PUT /api/admin/bookings/:id - Update booking
// ========================================
router.put('/bookings/:id',
    simpleAdminAuth,
    async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

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

            // Admin can update any field
            const allowedUpdates = [
                'status', 'driver', 'vehicleClass', 'pricing',
                'specialRequests', 'notes', 'payment'
            ];

            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    booking[key] = updates[key];
                }
            }

            // Track status change
            if (updates.status && updates.status !== booking.status) {
                booking.statusHistory = booking.statusHistory || [];
                booking.statusHistory.push({
                    status: updates.status,
                    timestamp: new Date(),
                    updatedBy: 'admin'
                });
            }

            await booking.save();

            res.json({
                success: true,
                message: 'Booking updated successfully',
                data: booking
            });

        } catch (error) {
            console.error('Admin update booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update booking'
            });
        }
    }
);

// ========================================
// GET /api/admin/stats - Dashboard statistics
// ========================================
router.get('/stats',
    simpleAdminAuth,
    async (req, res) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Today's bookings
            const todayBookings = await Booking.countDocuments({
                createdAt: { $gte: today, $lt: tomorrow }
            });

            // Today's revenue
            const todayRevenueResult = await Booking.aggregate([
                {
                    $match: {
                        createdAt: { $gte: today, $lt: tomorrow },
                        'payment.status': 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$pricing.totalUSD' }
                    }
                }
            ]);
            const todayRevenue = todayRevenueResult[0]?.total || 0;

            // Pending bookings
            const pendingBookings = await Booking.countDocuments({
                status: { $in: ['pending', 'confirmed'] }
            });

            // Total bookings
            const totalBookings = await Booking.countDocuments();

            // Bookings by status
            const bookingsByStatus = await Booking.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    todayBookings,
                    todayRevenue,
                    pendingBookings,
                    totalBookings,
                    bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {})
                }
            });

        } catch (error) {
            console.error('Admin stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get statistics'
            });
        }
    }
);

// ========================================
// GET /api/admin/customers - Get all customers
// ========================================
router.get('/customers',
    simpleAdminAuth,
    async (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;

            // Get unique customers from bookings
            const customers = await Booking.aggregate([
                {
                    $group: {
                        _id: '$contact.phone',
                        name: { $first: '$contact.name' },
                        email: { $first: '$contact.email' },
                        phone: { $first: '$contact.phone' },
                        totalTrips: { $sum: 1 },
                        totalSpent: { $sum: '$pricing.totalUSD' },
                        lastTrip: { $max: '$createdAt' }
                    }
                },
                { $sort: { totalTrips: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: parseInt(limit) }
            ]);

            res.json({
                success: true,
                data: customers
            });

        } catch (error) {
            console.error('Admin get customers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get customers'
            });
        }
    }
);

module.exports = router;
