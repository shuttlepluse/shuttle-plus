// ========================================
// Driver API Routes
// ========================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ========================================
// Authentication Middleware
// ========================================
const authenticateDriver = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const driver = await Driver.findById(decoded.driverId).populate('currentVehicle');

        if (!driver) {
            return res.status(401).json({ error: 'Driver not found' });
        }

        if (driver.status !== 'active') {
            return res.status(403).json({ error: 'Account not active' });
        }

        req.driver = driver;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ========================================
// Authentication Routes
// ========================================

// Register new driver
router.post('/register', async (req, res) => {
    try {
        const { email, password, phone, firstName, lastName } = req.body;

        // Check if driver already exists
        const existingDriver = await Driver.findOne({ email });
        if (existingDriver) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new driver
        const driver = new Driver({
            email,
            password,
            phone,
            firstName,
            lastName,
            status: 'pending', // Requires admin approval
            onlineStatus: 'offline'
        });

        await driver.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please wait for admin approval.',
            driverId: driver._id
        });
    } catch (error) {
        console.error('Driver registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find driver with password
        const driver = await Driver.findOne({ email }).select('+password');
        if (!driver) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await driver.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if driver is active
        if (driver.status !== 'active') {
            return res.status(403).json({
                error: 'Account not active',
                status: driver.status
            });
        }

        // Generate token
        const token = jwt.sign(
            { driverId: driver._id, email: driver.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Update last active time
        driver.lastActiveAt = new Date();
        await driver.save();

        res.json({
            success: true,
            token,
            driver: {
                id: driver._id,
                email: driver.email,
                firstName: driver.firstName,
                lastName: driver.lastName,
                fullName: driver.fullName,
                phone: driver.phone,
                profilePhoto: driver.profilePhoto,
                rating: driver.rating,
                completedTrips: driver.completedTrips,
                status: driver.status,
                onlineStatus: driver.onlineStatus
            }
        });
    } catch (error) {
        console.error('Driver login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ========================================
// Profile Routes
// ========================================

// Get driver profile
router.get('/profile', authenticateDriver, async (req, res) => {
    try {
        const driver = req.driver;
        res.json({
            id: driver._id,
            email: driver.email,
            phone: driver.phone,
            firstName: driver.firstName,
            lastName: driver.lastName,
            fullName: driver.fullName,
            profilePhoto: driver.profilePhoto,
            languages: driver.languages,
            license: driver.license,
            rating: driver.rating,
            completedTrips: driver.completedTrips,
            cancelledTrips: driver.cancelledTrips,
            acceptanceRate: driver.acceptanceRate,
            earnings: driver.earnings,
            status: driver.status,
            onlineStatus: driver.onlineStatus,
            currentVehicle: driver.currentVehicle,
            workingHours: driver.workingHours,
            registeredAt: driver.registeredAt
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update profile
router.put('/profile', authenticateDriver, async (req, res) => {
    try {
        const allowedUpdates = ['phone', 'profilePhoto', 'languages', 'emergencyContact', 'workingHours', 'notificationPreferences'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const driver = await Driver.findByIdAndUpdate(
            req.driver._id,
            updates,
            { new: true }
        ).populate('currentVehicle');

        res.json({
            success: true,
            driver: {
                id: driver._id,
                email: driver.email,
                phone: driver.phone,
                firstName: driver.firstName,
                lastName: driver.lastName,
                fullName: driver.fullName,
                profilePhoto: driver.profilePhoto,
                languages: driver.languages
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ========================================
// Status Routes
// ========================================

// Update online status
router.put('/status', authenticateDriver, async (req, res) => {
    try {
        const { onlineStatus } = req.body;

        if (!['online', 'offline', 'busy'].includes(onlineStatus)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        req.driver.onlineStatus = onlineStatus;
        req.driver.lastActiveAt = new Date();
        await req.driver.save();

        res.json({
            success: true,
            onlineStatus: req.driver.onlineStatus
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Update location
router.put('/location', authenticateDriver, async (req, res) => {
    try {
        const { longitude, latitude, heading, speed } = req.body;

        await req.driver.updateLocation(longitude, latitude, heading, speed);

        res.json({
            success: true,
            location: req.driver.location
        });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// ========================================
// Trip Routes
// ========================================

// Get assigned trips
router.get('/trips', authenticateDriver, async (req, res) => {
    try {
        const { status, limit = 20, page = 1 } = req.query;
        const query = { 'driver.driverId': req.driver._id };

        if (status) {
            query.status = status;
        }

        const trips = await Booking.find(query)
            .sort({ 'pickup.scheduledTime': -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Booking.countDocuments(query);

        res.json({
            trips,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get trips error:', error);
        res.status(500).json({ error: 'Failed to get trips' });
    }
});

// Get available trips (pending bookings without driver)
router.get('/trips/available', authenticateDriver, async (req, res) => {
    try {
        const trips = await Booking.find({
            status: { $in: ['pending', 'confirmed'] },
            'driver.driverId': { $exists: false }
        })
        .sort({ 'pickup.scheduledTime': 1 })
        .limit(10);

        res.json({ trips });
    } catch (error) {
        console.error('Get available trips error:', error);
        res.status(500).json({ error: 'Failed to get available trips' });
    }
});

// Accept a trip
router.post('/trips/:bookingId/accept', authenticateDriver, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.driver?.driverId) {
            return res.status(400).json({ error: 'Trip already assigned' });
        }

        // Assign driver
        const vehicle = req.driver.currentVehicle;
        booking.driver = {
            driverId: req.driver._id,
            name: req.driver.fullName,
            phone: req.driver.phone,
            photo: req.driver.profilePhoto,
            vehiclePlate: vehicle?.plateNumber || 'N/A',
            vehicleModel: vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A',
            vehicleColor: vehicle?.color || 'N/A',
            rating: req.driver.rating.average
        };
        booking.status = 'driver_assigned';
        booking.statusHistory.push({
            status: 'driver_assigned',
            timestamp: new Date(),
            note: `Driver ${req.driver.fullName} accepted the trip`
        });

        await booking.save();

        // Update driver status to busy
        req.driver.onlineStatus = 'busy';
        await req.driver.save();

        res.json({
            success: true,
            message: 'Trip accepted',
            booking
        });
    } catch (error) {
        console.error('Accept trip error:', error);
        res.status(500).json({ error: 'Failed to accept trip' });
    }
});

// Update trip status
router.put('/trips/:bookingId/status', authenticateDriver, async (req, res) => {
    try {
        const { status, note } = req.body;
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.driver?.driverId?.toString() !== req.driver._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const validStatuses = ['driver_enroute', 'driver_arrived', 'passenger_picked_up', 'in_progress', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        booking.status = status;
        booking.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || `Status updated by driver`,
            updatedBy: 'driver'
        });

        // If completed, update driver stats
        if (status === 'completed') {
            req.driver.completedTrips += 1;
            req.driver.earnings.currentWeek += booking.pricing.totalUSD;
            req.driver.earnings.currentMonth += booking.pricing.totalUSD;
            req.driver.earnings.total += booking.pricing.totalUSD;
            req.driver.onlineStatus = 'online';
            await req.driver.save();
        }

        await booking.save();

        res.json({
            success: true,
            message: 'Status updated',
            booking
        });
    } catch (error) {
        console.error('Update trip status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// ========================================
// Earnings Routes
// ========================================

// Get earnings summary
router.get('/earnings', authenticateDriver, async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const driver = req.driver;

        // Calculate date range
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            default:
                startDate = new Date(now.setHours(0, 0, 0, 0));
        }

        // Get completed trips in period
        const trips = await Booking.find({
            'driver.driverId': driver._id,
            status: 'completed',
            updatedAt: { $gte: startDate }
        });

        const totalEarnings = trips.reduce((sum, trip) => sum + (trip.pricing?.totalUSD || 0), 0);
        const totalTrips = trips.length;

        res.json({
            period,
            earnings: {
                total: totalEarnings,
                trips: totalTrips,
                average: totalTrips > 0 ? (totalEarnings / totalTrips).toFixed(2) : 0
            },
            balance: driver.earnings.balance,
            lifetimeEarnings: driver.earnings.total,
            lastPayout: driver.earnings.lastPayout
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ error: 'Failed to get earnings' });
    }
});

// Get earnings history
router.get('/earnings/history', authenticateDriver, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const trips = await Booking.find({
            'driver.driverId': req.driver._id,
            status: 'completed'
        })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select('bookingReference pricing pickup dropoff updatedAt');

        const total = await Booking.countDocuments({
            'driver.driverId': req.driver._id,
            status: 'completed'
        });

        res.json({
            trips,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get earnings history error:', error);
        res.status(500).json({ error: 'Failed to get earnings history' });
    }
});

// ========================================
// Dashboard Stats
// ========================================

router.get('/stats', authenticateDriver, async (req, res) => {
    try {
        const driver = req.driver;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Today's completed trips
        const todayTrips = await Booking.find({
            'driver.driverId': driver._id,
            status: 'completed',
            updatedAt: { $gte: today }
        });

        const todayEarnings = todayTrips.reduce((sum, trip) => sum + (trip.pricing?.totalUSD || 0), 0);

        // Pending trips
        const pendingTrips = await Booking.countDocuments({
            'driver.driverId': driver._id,
            status: { $in: ['driver_assigned', 'driver_enroute', 'driver_arrived', 'in_progress'] }
        });

        // Upcoming scheduled trips
        const upcomingTrips = await Booking.find({
            'driver.driverId': driver._id,
            status: 'driver_assigned',
            'pickup.scheduledTime': { $gt: new Date() }
        })
        .sort({ 'pickup.scheduledTime': 1 })
        .limit(5);

        res.json({
            today: {
                trips: todayTrips.length,
                earnings: todayEarnings
            },
            overall: {
                completedTrips: driver.completedTrips,
                rating: driver.rating.average,
                acceptanceRate: driver.acceptanceRate,
                totalEarnings: driver.earnings.total
            },
            pending: pendingTrips,
            upcoming: upcomingTrips,
            onlineStatus: driver.onlineStatus
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// ========================================
// Admin Routes (for managing drivers)
// ========================================

// Get all drivers (admin)
router.get('/admin/list', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};

        if (status) {
            query.status = status;
        }

        const drivers = await Driver.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('currentVehicle');

        const total = await Driver.countDocuments(query);

        res.json({
            drivers: drivers.map(d => ({
                id: d._id,
                email: d.email,
                phone: d.phone,
                fullName: d.fullName,
                status: d.status,
                onlineStatus: d.onlineStatus,
                rating: d.rating,
                completedTrips: d.completedTrips,
                vehicle: d.currentVehicle,
                registeredAt: d.registeredAt
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({ error: 'Failed to get drivers' });
    }
});

// Approve driver (admin)
router.post('/admin/:driverId/approve', async (req, res) => {
    try {
        const driver = await Driver.findByIdAndUpdate(
            req.params.driverId,
            {
                status: 'active',
                approvedAt: new Date()
            },
            { new: true }
        );

        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        res.json({
            success: true,
            message: 'Driver approved',
            driver: {
                id: driver._id,
                fullName: driver.fullName,
                status: driver.status
            }
        });
    } catch (error) {
        console.error('Approve driver error:', error);
        res.status(500).json({ error: 'Failed to approve driver' });
    }
});

// Suspend driver (admin)
router.post('/admin/:driverId/suspend', async (req, res) => {
    try {
        const { reason } = req.body;

        const driver = await Driver.findByIdAndUpdate(
            req.params.driverId,
            {
                status: 'suspended',
                onlineStatus: 'offline',
                $push: {
                    adminNotes: {
                        note: `Suspended: ${reason || 'No reason provided'}`,
                        addedAt: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        res.json({
            success: true,
            message: 'Driver suspended',
            driver: {
                id: driver._id,
                fullName: driver.fullName,
                status: driver.status
            }
        });
    } catch (error) {
        console.error('Suspend driver error:', error);
        res.status(500).json({ error: 'Failed to suspend driver' });
    }
});

module.exports = router;
