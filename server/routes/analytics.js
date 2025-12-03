// ========================================
// Analytics Routes
// ========================================

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

// ========================================
// Dashboard Overview
// ========================================

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;

        const stats = await analyticsService.getDashboardStats({
            startDate,
            endDate,
            period: period || 'month'
        });

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[Analytics] Dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Booking Analytics
// ========================================

// Get bookings over time
router.get('/bookings/timeline', async (req, res) => {
    try {
        const { startDate, endDate, granularity = 'day' } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getBookingsOverTime(start, end, granularity);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get booking status breakdown
router.get('/bookings/status', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getStatusBreakdown(start, end);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicle breakdown
router.get('/bookings/vehicles', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getVehicleBreakdown(start, end);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Revenue Analytics
// ========================================

// Get revenue stats
router.get('/revenue', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getRevenueStats(start, end);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get payment method breakdown
router.get('/revenue/payments', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getPaymentMethodBreakdown(start, end);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Destination Analytics
// ========================================

// Get top destinations
router.get('/destinations/top', async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getTopDestinations(start, end, parseInt(limit));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Time Analysis
// ========================================

// Get peak hours
router.get('/time/peak-hours', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getPeakHoursAnalysis(start, end);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Driver Analytics
// ========================================

// Get driver performance
router.get('/drivers/performance', async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getDriverPerformance(start, end, parseInt(limit));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Customer Analytics
// ========================================

// Get customer satisfaction metrics
router.get('/customers/satisfaction', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getCustomerSatisfactionMetrics(start, end);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Flight Analytics
// ========================================

// Get flight tracking accuracy
router.get('/flights/accuracy', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { startDate: start, endDate: end } = analyticsService.getDateRange({
            startDate,
            endDate
        });

        const data = await analyticsService.getFlightTrackingAccuracy(start, end);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Reports
// ========================================

// Generate custom report
router.post('/reports/generate', async (req, res) => {
    try {
        const { startDate, endDate, metrics, format, groupBy } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const report = await analyticsService.generateReport({
            startDate,
            endDate,
            metrics,
            format,
            groupBy
        });

        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get quick stats (for real-time dashboard)
router.get('/quick-stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const now = new Date();

        const [todayStats, todayRevenue] = await Promise.all([
            analyticsService.getBookingStats(today, now),
            analyticsService.getRevenueStats(today, now)
        ]);

        res.json({
            success: true,
            data: {
                todayBookings: todayStats.total,
                todayRevenue: todayRevenue.total,
                todayCompleted: todayStats.completed,
                pendingBookings: todayStats.pending,
                timestamp: now
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
