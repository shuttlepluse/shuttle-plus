// ========================================
// Group Booking Routes
// ========================================

const express = require('express');
const router = express.Router();
const GroupBooking = require('../models/GroupBooking');
const Booking = require('../models/Booking');

// Create group booking
router.post('/', async (req, res) => {
    try {
        const {
            organizer,
            groupName,
            groupType,
            description,
            event,
            sharedDetails,
            bookings,
            corporateAccountId
        } = req.body;

        // Validation
        if (!organizer?.name || !organizer?.email || !organizer?.phone) {
            return res.status(400).json({ error: 'Organizer details required' });
        }
        if (!groupName) {
            return res.status(400).json({ error: 'Group name required' });
        }
        if (!sharedDetails?.type) {
            return res.status(400).json({ error: 'Trip type required' });
        }

        const group = new GroupBooking({
            organizer,
            groupName,
            groupType,
            description,
            event,
            sharedDetails,
            bookings: bookings || [],
            corporateAccountId,
            status: 'draft'
        });

        // Calculate pricing
        group.recalculatePricing();

        await group.save();

        res.status(201).json({
            success: true,
            group: {
                groupReference: group.groupReference,
                groupName: group.groupName,
                totalBookings: group.totalBookings,
                totalPassengers: group.totalPassengers,
                pricing: group.pricing,
                status: group.status
            }
        });

    } catch (error) {
        console.error('[Groups] Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get group by reference
router.get('/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const group = await GroupBooking.findOne({ groupReference: reference })
            .populate('bookings.bookingId');

        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        res.json({ success: true, group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update group booking
router.put('/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        const updates = req.body;

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        // Don't allow updates to confirmed/completed groups
        if (['confirmed', 'completed'].includes(group.status)) {
            return res.status(400).json({ error: 'Cannot modify confirmed group booking' });
        }

        // Apply updates
        const allowedFields = ['groupName', 'description', 'event', 'sharedDetails', 'notes'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                group[field] = updates[field];
            }
        });

        await group.save();

        res.json({ success: true, group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add booking to group
router.post('/:reference/bookings', async (req, res) => {
    try {
        const { reference } = req.params;
        const bookingData = req.body;

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        // Validate booking data
        if (!bookingData.passengerName) {
            return res.status(400).json({ error: 'Passenger name required' });
        }

        // Calculate individual pricing based on group's shared details
        const basePrices = {
            standard: 35,
            executive: 50,
            suv: 65,
            luxury: 100
        };
        const vehicleClass = bookingData.vehicleClass || 'standard';
        const basePrice = basePrices[vehicleClass] || 35;

        group.addBooking({
            ...bookingData,
            vehicleClass,
            pricing: {
                basePrice,
                discount: 0,
                finalPrice: basePrice
            },
            status: 'pending'
        });

        await group.save();

        res.json({
            success: true,
            message: 'Booking added to group',
            totalBookings: group.totalBookings,
            pricing: group.pricing
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove booking from group
router.delete('/:reference/bookings/:bookingId', async (req, res) => {
    try {
        const { reference, bookingId } = req.params;

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        group.removeBooking(bookingId);
        await group.save();

        res.json({
            success: true,
            message: 'Booking removed from group',
            totalBookings: group.totalBookings,
            pricing: group.pricing
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get group pricing quote
router.post('/:reference/quote', async (req, res) => {
    try {
        const { reference } = req.params;

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        group.recalculatePricing();

        res.json({
            success: true,
            quote: {
                groupReference: group.groupReference,
                groupName: group.groupName,
                totalBookings: group.totalBookings,
                totalPassengers: group.totalPassengers,
                pricing: group.pricing,
                bookings: group.bookings.map(b => ({
                    passengerName: b.passengerName,
                    vehicleClass: b.vehicleClass,
                    passengers: b.passengers,
                    basePrice: b.pricing?.basePrice,
                    status: b.status
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit group for approval
router.post('/:reference/submit', async (req, res) => {
    try {
        const { reference } = req.params;

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        if (group.bookings.length === 0) {
            return res.status(400).json({ error: 'Cannot submit empty group' });
        }

        group.status = 'pending_approval';
        await group.save();

        res.json({
            success: true,
            message: 'Group booking submitted for approval',
            groupReference: group.groupReference
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Confirm group booking
router.post('/:reference/confirm', async (req, res) => {
    try {
        const { reference } = req.params;

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        // Check deposit is paid
        if (!group.pricing.depositPaid && group.payment.totalPaid < group.pricing.depositRequired) {
            return res.status(400).json({
                error: 'Deposit required before confirmation',
                depositRequired: group.pricing.depositRequired,
                currentlyPaid: group.payment.totalPaid
            });
        }

        // Create individual bookings
        const createdBookings = [];
        for (const booking of group.bookings) {
            if (booking.status === 'pending') {
                const newBooking = new Booking({
                    type: group.sharedDetails.type === 'departure' ? 'departure' : 'arrival',
                    flight: group.sharedDetails.flight,
                    pickup: {
                        location: group.sharedDetails.pickup.location,
                        address: group.sharedDetails.pickup.address,
                        scheduledTime: group.sharedDetails.pickup.scheduledTime,
                        notes: group.sharedDetails.pickup.notes
                    },
                    dropoff: {
                        location: group.sharedDetails.dropoff.location,
                        address: group.sharedDetails.dropoff.address,
                        notes: group.sharedDetails.dropoff.notes
                    },
                    vehicleClass: booking.vehicleClass,
                    passengers: booking.passengers || 1,
                    luggage: booking.luggage || 1,
                    specialRequests: booking.specialRequests,
                    contact: {
                        name: booking.passengerName,
                        phone: booking.passengerPhone || group.organizer.phone,
                        email: booking.passengerEmail || group.organizer.email
                    },
                    pricing: {
                        baseFare: booking.pricing.basePrice,
                        discount: group.pricing.discountPercentage,
                        totalUSD: booking.pricing.finalPrice * (1 - group.pricing.discountPercentage / 100)
                    },
                    status: 'confirmed',
                    source: 'group_booking'
                });

                await newBooking.save();
                booking.bookingId = newBooking._id;
                booking.bookingReference = newBooking.bookingReference;
                booking.status = 'confirmed';
                createdBookings.push(newBooking);
            }
        }

        group.status = 'confirmed';
        group.approvedAt = new Date();
        await group.save();

        res.json({
            success: true,
            message: `Group confirmed with ${createdBookings.length} bookings`,
            groupReference: group.groupReference,
            bookings: createdBookings.map(b => ({
                reference: b.bookingReference,
                passenger: b.contact.name
            }))
        });
    } catch (error) {
        console.error('[Groups] Confirm error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add payment to group
router.post('/:reference/payments', async (req, res) => {
    try {
        const { reference } = req.params;
        const { amount, method, transactionId, paidBy } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid payment amount required' });
        }

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        group.addPayment({
            amount,
            method: method || 'cash',
            transactionId,
            paidBy: paidBy || group.organizer.name,
            status: 'completed'
        });

        await group.save();

        res.json({
            success: true,
            message: `Payment of $${amount} recorded`,
            payment: {
                totalPaid: group.payment.totalPaid,
                remainingBalance: group.payment.remainingBalance,
                status: group.payment.status,
                depositPaid: group.pricing.depositPaid
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel group booking
router.post('/:reference/cancel', async (req, res) => {
    try {
        const { reference } = req.params;
        const { reason } = req.body;

        const group = await GroupBooking.findOne({ groupReference: reference });
        if (!group) {
            return res.status(404).json({ error: 'Group booking not found' });
        }

        // Cancel all individual bookings
        for (const booking of group.bookings) {
            if (booking.bookingId) {
                await Booking.findByIdAndUpdate(booking.bookingId, { status: 'cancelled' });
            }
            booking.status = 'cancelled';
        }

        group.status = 'cancelled';
        group.notes = `${group.notes || ''}\nCancelled: ${reason || 'No reason provided'}`;
        await group.save();

        res.json({
            success: true,
            message: 'Group booking cancelled',
            refundAmount: group.payment.totalPaid // Would need refund policy logic
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List group bookings
router.get('/', async (req, res) => {
    try {
        const { status, organizer, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (organizer) query['organizer.email'] = organizer;

        const groups = await GroupBooking.find(query)
            .select('groupReference groupName organizer.name status totalBookings pricing.finalTotal sharedDetails.pickup.scheduledTime createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await GroupBooking.countDocuments(query);

        res.json({
            success: true,
            groups,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
