// ========================================
// Analytics & Reporting Service
// ========================================

const Booking = require('../models/Booking');

class AnalyticsService {
    /**
     * Get dashboard overview statistics
     */
    async getDashboardStats(dateRange = {}) {
        const { startDate, endDate } = this.getDateRange(dateRange);

        const [
            bookingStats,
            revenueStats,
            statusBreakdown,
            vehicleBreakdown,
            topDestinations
        ] = await Promise.all([
            this.getBookingStats(startDate, endDate),
            this.getRevenueStats(startDate, endDate),
            this.getStatusBreakdown(startDate, endDate),
            this.getVehicleBreakdown(startDate, endDate),
            this.getTopDestinations(startDate, endDate)
        ]);

        // Get comparison with previous period
        const previousStart = new Date(startDate);
        const periodLength = endDate - startDate;
        previousStart.setTime(startDate.getTime() - periodLength);
        const previousEnd = new Date(startDate);

        const [previousBookings, previousRevenue] = await Promise.all([
            this.getBookingStats(previousStart, previousEnd),
            this.getRevenueStats(previousStart, previousEnd)
        ]);

        return {
            period: { startDate, endDate },
            bookings: {
                ...bookingStats,
                change: this.calculatePercentageChange(previousBookings.total, bookingStats.total)
            },
            revenue: {
                ...revenueStats,
                change: this.calculatePercentageChange(previousRevenue.total, revenueStats.total)
            },
            statusBreakdown,
            vehicleBreakdown,
            topDestinations
        };
    }

    /**
     * Get booking statistics
     */
    async getBookingStats(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    },
                    noShow: {
                        $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    avgPassengers: { $avg: '$passengers' }
                }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        if (result.length === 0) {
            return {
                total: 0,
                completed: 0,
                cancelled: 0,
                noShow: 0,
                pending: 0,
                completionRate: 0,
                avgPassengers: 0
            };
        }

        const stats = result[0];
        return {
            total: stats.total,
            completed: stats.completed,
            cancelled: stats.cancelled,
            noShow: stats.noShow,
            pending: stats.pending,
            completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            avgPassengers: Math.round(stats.avgPassengers * 10) / 10
        };
    }

    /**
     * Get revenue statistics
     */
    async getRevenueStats(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $in: ['completed', 'confirmed', 'in_progress'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$pricing.totalUSD' },
                    totalETB: { $sum: '$pricing.totalETB' },
                    avgPerBooking: { $avg: '$pricing.totalUSD' },
                    count: { $sum: 1 }
                }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        if (result.length === 0) {
            return { total: 0, totalETB: 0, avgPerBooking: 0, count: 0 };
        }

        const stats = result[0];
        return {
            total: Math.round(stats.total * 100) / 100,
            totalETB: Math.round(stats.totalETB || 0),
            avgPerBooking: Math.round(stats.avgPerBooking * 100) / 100,
            count: stats.count
        };
    }

    /**
     * Get booking status breakdown
     */
    async getStatusBreakdown(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        return result.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
    }

    /**
     * Get vehicle class breakdown
     */
    async getVehicleBreakdown(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$vehicleClass',
                    count: { $sum: 1 },
                    revenue: { $sum: '$pricing.totalUSD' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        return result.map(item => ({
            vehicleClass: item._id || 'standard',
            count: item.count,
            revenue: Math.round(item.revenue * 100) / 100
        }));
    }

    /**
     * Get top destinations by zone
     */
    async getTopDestinations(startDate, endDate, limit = 10) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$dropoff.location',
                    zone: { $first: '$dropoff.zone' },
                    count: { $sum: 1 },
                    revenue: { $sum: '$pricing.totalUSD' }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: limit
            }
        ];

        const result = await Booking.aggregate(pipeline);

        return result.map(item => ({
            location: item._id,
            zone: item.zone,
            count: item.count,
            revenue: Math.round(item.revenue * 100) / 100
        }));
    }

    /**
     * Get bookings over time (daily/weekly/monthly)
     */
    async getBookingsOverTime(startDate, endDate, granularity = 'day') {
        let groupBy;

        switch (granularity) {
            case 'hour':
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                    hour: { $hour: '$createdAt' }
                };
                break;
            case 'day':
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                };
                break;
            case 'week':
                groupBy = {
                    year: { $year: '$createdAt' },
                    week: { $week: '$createdAt' }
                };
                break;
            case 'month':
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
                break;
            default:
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                };
        }

        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    bookings: { $sum: 1 },
                    revenue: { $sum: '$pricing.totalUSD' },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1, '_id.hour': 1 }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        return result.map(item => ({
            date: this.formatDateFromGroup(item._id, granularity),
            bookings: item.bookings,
            revenue: Math.round(item.revenue * 100) / 100,
            completed: item.completed
        }));
    }

    /**
     * Get peak hours analysis
     */
    async getPeakHoursAnalysis(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $hour: '$pickup.scheduledTime' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        // Fill in missing hours
        const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
        result.forEach(item => {
            hourlyData[item._id].count = item.count;
        });

        return hourlyData;
    }

    /**
     * Get payment method breakdown
     */
    async getPaymentMethodBreakdown(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    'payment.status': 'paid'
                }
            },
            {
                $group: {
                    _id: '$payment.method',
                    count: { $sum: 1 },
                    total: { $sum: '$pricing.totalUSD' }
                }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        return result.map(item => ({
            method: item._id || 'cash',
            count: item.count,
            total: Math.round(item.total * 100) / 100
        }));
    }

    /**
     * Get driver performance metrics
     */
    async getDriverPerformance(startDate, endDate, limit = 10) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    'driver.driverId': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$driver.driverId',
                    driverName: { $first: '$driver.name' },
                    totalTrips: { $sum: 1 },
                    completedTrips: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    totalRevenue: { $sum: '$pricing.totalUSD' },
                    avgRating: { $avg: '$rating.score' }
                }
            },
            {
                $addFields: {
                    completionRate: {
                        $multiply: [
                            { $divide: ['$completedTrips', '$totalTrips'] },
                            100
                        ]
                    }
                }
            },
            {
                $sort: { completedTrips: -1 }
            },
            {
                $limit: limit
            }
        ];

        const result = await Booking.aggregate(pipeline);

        return result.map(item => ({
            driverId: item._id,
            driverName: item.driverName,
            totalTrips: item.totalTrips,
            completedTrips: item.completedTrips,
            completionRate: Math.round(item.completionRate),
            totalRevenue: Math.round(item.totalRevenue * 100) / 100,
            avgRating: item.avgRating ? Math.round(item.avgRating * 10) / 10 : null
        }));
    }

    /**
     * Get customer satisfaction metrics
     */
    async getCustomerSatisfactionMetrics(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    'rating.score': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating.score' },
                    totalRatings: { $sum: 1 },
                    ratings: { $push: '$rating.score' }
                }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        if (result.length === 0) {
            return {
                avgRating: 0,
                totalRatings: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const stats = result[0];
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        stats.ratings.forEach(rating => {
            if (distribution[rating] !== undefined) {
                distribution[rating]++;
            }
        });

        return {
            avgRating: Math.round(stats.avgRating * 10) / 10,
            totalRatings: stats.totalRatings,
            distribution
        };
    }

    /**
     * Get flight tracking accuracy
     */
    async getFlightTrackingAccuracy(startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    'flight.number': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalWithFlight: { $sum: 1 },
                    tracked: {
                        $sum: { $cond: [{ $ne: ['$flight.status', 'unknown'] }, 1, 0] }
                    },
                    delayed: {
                        $sum: { $cond: [{ $eq: ['$flight.status', 'delayed'] }, 1, 0] }
                    },
                    onTime: {
                        $sum: { $cond: [{ $in: ['$flight.status', ['scheduled', 'landed', 'departed']] }, 1, 0] }
                    }
                }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        if (result.length === 0) {
            return {
                totalFlights: 0,
                trackedSuccessfully: 0,
                trackingRate: 0,
                delayRate: 0
            };
        }

        const stats = result[0];
        return {
            totalFlights: stats.totalWithFlight,
            trackedSuccessfully: stats.tracked,
            trackingRate: stats.totalWithFlight > 0
                ? Math.round((stats.tracked / stats.totalWithFlight) * 100)
                : 0,
            delayRate: stats.totalWithFlight > 0
                ? Math.round((stats.delayed / stats.totalWithFlight) * 100)
                : 0
        };
    }

    /**
     * Generate custom report
     */
    async generateReport(options) {
        const {
            startDate,
            endDate,
            metrics = ['bookings', 'revenue', 'drivers'],
            format = 'json',
            groupBy = 'day'
        } = options;

        const report = {
            generatedAt: new Date(),
            period: { startDate: new Date(startDate), endDate: new Date(endDate) },
            data: {}
        };

        // Get requested metrics
        if (metrics.includes('bookings')) {
            report.data.bookings = await this.getBookingsOverTime(
                new Date(startDate),
                new Date(endDate),
                groupBy
            );
        }

        if (metrics.includes('revenue')) {
            report.data.revenue = await this.getRevenueStats(
                new Date(startDate),
                new Date(endDate)
            );
        }

        if (metrics.includes('drivers')) {
            report.data.drivers = await this.getDriverPerformance(
                new Date(startDate),
                new Date(endDate),
                20
            );
        }

        if (metrics.includes('destinations')) {
            report.data.destinations = await this.getTopDestinations(
                new Date(startDate),
                new Date(endDate),
                20
            );
        }

        if (metrics.includes('payments')) {
            report.data.payments = await this.getPaymentMethodBreakdown(
                new Date(startDate),
                new Date(endDate)
            );
        }

        if (metrics.includes('satisfaction')) {
            report.data.satisfaction = await this.getCustomerSatisfactionMetrics(
                new Date(startDate),
                new Date(endDate)
            );
        }

        return report;
    }

    // ========================================
    // Helper Methods
    // ========================================

    getDateRange(options = {}) {
        let { startDate, endDate, period } = options;

        if (!startDate && !endDate && period) {
            endDate = new Date();
            startDate = new Date();

            switch (period) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'yesterday':
                    startDate.setDate(startDate.getDate() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'week':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case 'quarter':
                    startDate.setMonth(startDate.getMonth() - 3);
                    break;
                case 'year':
                    startDate.setFullYear(startDate.getFullYear() - 1);
                    break;
                default:
                    startDate.setDate(startDate.getDate() - 30);
            }
        }

        return {
            startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: endDate ? new Date(endDate) : new Date()
        };
    }

    calculatePercentageChange(previous, current) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }

    formatDateFromGroup(group, granularity) {
        if (granularity === 'hour') {
            return `${group.year}-${String(group.month).padStart(2, '0')}-${String(group.day).padStart(2, '0')} ${String(group.hour).padStart(2, '0')}:00`;
        }
        if (granularity === 'week') {
            return `${group.year}-W${String(group.week).padStart(2, '0')}`;
        }
        if (granularity === 'month') {
            return `${group.year}-${String(group.month).padStart(2, '0')}`;
        }
        return `${group.year}-${String(group.month).padStart(2, '0')}-${String(group.day).padStart(2, '0')}`;
    }
}

module.exports = new AnalyticsService();
