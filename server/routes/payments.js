// ========================================
// Payment Routes
// ========================================

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const { authenticate, optionalAuth } = require('../middleware/auth');
const telebirrService = require('../services/telebirrService');

// Stripe setup (conditional)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

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
// POST /api/payments/stripe/create-intent - Create Stripe PaymentIntent
// ========================================
router.post('/stripe/create-intent',
    optionalAuth,
    [
        body('bookingId').notEmpty().withMessage('Booking ID is required'),
        body('amount').isFloat({ min: 1 }).withMessage('Valid amount required'),
        body('currency')
            .optional()
            .isIn(['USD', 'ETB'])
            .withMessage('Currency must be USD or ETB')
    ],
    handleValidation,
    async (req, res) => {
        try {
            if (!stripe) {
                return res.status(503).json({
                    success: false,
                    message: 'Card payments are not available at this time'
                });
            }

            const { bookingId, amount, currency = 'USD' } = req.body;

            // Find booking
            const booking = await Booking.findOne({
                $or: [
                    { _id: bookingId },
                    { bookingReference: bookingId.toUpperCase() }
                ]
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Create PaymentIntent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Stripe uses cents
                currency: currency.toLowerCase(),
                metadata: {
                    bookingId: booking._id.toString(),
                    bookingReference: booking.bookingReference
                },
                description: `Shuttle Plus Transfer - ${booking.bookingReference}`
            });

            // Update booking with payment intent
            booking.payment.method = 'stripe';
            booking.payment.status = 'processing';
            booking.payment.transactionId = paymentIntent.id;
            await booking.save();

            res.json({
                success: true,
                data: {
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id
                }
            });

        } catch (error) {
            console.error('Create payment intent error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create payment'
            });
        }
    }
);

// ========================================
// POST /api/payments/stripe/webhook - Stripe webhook handler
// ========================================
// Note: This endpoint needs raw body parsing (not JSON)
// Configure in server.js before json middleware for this route
// ========================================
router.post('/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        try {
            if (!stripe) {
                return res.status(503).send('Stripe not configured');
            }

            const sig = req.headers['stripe-signature'];
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

            // In development without webhook secret, skip signature verification
            let event;
            if (!webhookSecret || process.env.NODE_ENV === 'development') {
                console.log('[Stripe Webhook] Development mode - skipping signature verification');
                event = JSON.parse(req.body.toString());
            } else {
                try {
                    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
                } catch (err) {
                    console.error('Webhook signature verification failed:', err.message);
                    return res.status(400).send(`Webhook Error: ${err.message}`);
                }
            }

            console.log(`[Stripe Webhook] Received event: ${event.type}`);

            // Import email service for sending notifications
            const emailService = require('../services/emailService');

            // Handle different event types
            switch (event.type) {
                case 'payment_intent.succeeded': {
                    const paymentIntent = event.data.object;
                    const bookingId = paymentIntent.metadata.bookingId;
                    console.log(`[Stripe] Payment succeeded for booking: ${bookingId}`);

                    if (bookingId) {
                        const booking = await Booking.findById(bookingId);
                        if (booking) {
                            booking.payment.status = 'paid';
                            booking.payment.paidAt = new Date();
                            booking.payment.stripePaymentId = paymentIntent.id;
                            booking.payment.amount = paymentIntent.amount / 100;
                            booking.payment.currency = paymentIntent.currency.toUpperCase();

                            if (booking.status === 'pending') {
                                await booking.updateStatus('confirmed', 'Payment received via Stripe');
                            } else {
                                await booking.save();
                            }

                            // Send payment confirmation email
                            if (booking.contact?.email) {
                                await emailService.sendPaymentConfirmation(booking, {
                                    amount: paymentIntent.amount / 100,
                                    currency: paymentIntent.currency.toUpperCase(),
                                    method: 'stripe',
                                    transactionId: paymentIntent.id
                                });
                            }
                        }
                    }
                    break;
                }

                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object;
                    const bookingId = paymentIntent.metadata.bookingId;
                    const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
                    console.log(`[Stripe] Payment failed for booking: ${bookingId} - ${errorMessage}`);

                    if (bookingId) {
                        const booking = await Booking.findById(bookingId);
                        if (booking) {
                            booking.payment.status = 'failed';
                            booking.payment.failureReason = errorMessage;
                            await booking.save();
                        }
                    }
                    break;
                }

                case 'payment_intent.canceled': {
                    const paymentIntent = event.data.object;
                    const bookingId = paymentIntent.metadata.bookingId;
                    console.log(`[Stripe] Payment canceled for booking: ${bookingId}`);

                    if (bookingId) {
                        const booking = await Booking.findById(bookingId);
                        if (booking) {
                            booking.payment.status = 'cancelled';
                            await booking.save();
                        }
                    }
                    break;
                }

                case 'charge.refunded': {
                    const charge = event.data.object;
                    const paymentIntentId = charge.payment_intent;
                    console.log(`[Stripe] Charge refunded: ${charge.id}`);

                    // Find booking by payment intent ID
                    const booking = await Booking.findOne({
                        'payment.transactionId': paymentIntentId
                    });

                    if (booking) {
                        const refundAmount = charge.amount_refunded / 100;
                        booking.payment.status = charge.refunded ? 'refunded' : 'partially_refunded';
                        booking.payment.refundedAmount = refundAmount;
                        booking.payment.refundedAt = new Date();
                        await booking.save();
                    }
                    break;
                }

                case 'charge.dispute.created': {
                    const dispute = event.data.object;
                    console.log(`[Stripe] Dispute created: ${dispute.id}`);
                    // Log dispute for admin review
                    console.warn(`[DISPUTE] Charge ${dispute.charge} disputed. Amount: ${dispute.amount / 100}`);
                    break;
                }

                default:
                    console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
            }

            res.json({ received: true });

        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).json({ error: 'Webhook handler failed' });
        }
    }
);

// ========================================
// POST /api/payments/telebirr/initiate - Initiate Telebirr payment
// ========================================
router.post('/telebirr/initiate',
    optionalAuth,
    [
        body('bookingId').notEmpty().withMessage('Booking ID is required'),
        body('amount').isFloat({ min: 1 }).withMessage('Valid amount required'),
        body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { bookingId, amount, phone } = req.body;

            // Find booking
            const booking = await Booking.findOne({
                $or: [
                    { _id: bookingId },
                    { bookingReference: bookingId.toUpperCase() }
                ]
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Check if Telebirr is configured
            if (!telebirrService.isConfigured() && process.env.NODE_ENV === 'production') {
                return res.status(503).json({
                    success: false,
                    message: 'Telebirr payments are not available at this time'
                });
            }

            // Initiate payment via Telebirr service
            const paymentResult = await telebirrService.initiatePayment({
                bookingReference: booking.bookingReference,
                amount: amount,
                subject: `Airport Transfer - ${booking.bookingReference}`,
                customerPhone: phone || booking.customer?.phone
            });

            if (!paymentResult.success) {
                return res.status(400).json({
                    success: false,
                    message: paymentResult.error || 'Failed to initiate Telebirr payment'
                });
            }

            // Update booking with payment info
            booking.payment.method = 'telebirr';
            booking.payment.status = 'processing';
            booking.payment.transactionId = paymentResult.outTradeNo;
            await booking.save();

            // Return payment URL for redirect
            res.json({
                success: true,
                data: {
                    transactionRef: paymentResult.outTradeNo,
                    redirectUrl: paymentResult.paymentUrl,
                    prepayId: paymentResult.prepayId,
                    amount,
                    currency: 'ETB',
                    isMock: paymentResult.isMock || false
                }
            });

        } catch (error) {
            console.error('Telebirr initiate error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to initiate payment'
            });
        }
    }
);

// ========================================
// POST /api/payments/telebirr/callback - Telebirr callback handler
// ========================================
router.post('/telebirr/callback', async (req, res) => {
    try {
        console.log('Telebirr callback received:', JSON.stringify(req.body));

        // Process the callback using telebirrService
        const callbackResult = await telebirrService.processCallback(req.body);

        if (!callbackResult.success) {
            console.error('Callback verification failed:', callbackResult.error);
            return res.status(400).json({
                success: false,
                message: callbackResult.error
            });
        }

        // Find booking by transaction reference (outTradeNo)
        const booking = await Booking.findOne({
            'payment.transactionId': callbackResult.outTradeNo
        });

        if (!booking) {
            console.error('Booking not found for transaction:', callbackResult.outTradeNo);
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Update booking based on payment status
        if (callbackResult.status === 'paid') {
            booking.payment.status = 'paid';
            booking.payment.paidAt = callbackResult.paidAt || new Date();
            // Store Telebirr's transaction ID if different
            if (callbackResult.tradeNo) {
                booking.payment.telebirrTradeNo = callbackResult.tradeNo;
            }
            // Update booking status to confirmed
            if (booking.status === 'pending') {
                await booking.updateStatus('confirmed', 'Payment received via Telebirr');
            } else {
                await booking.save();
            }
            console.log(`Payment confirmed for booking ${booking.bookingReference}`);
        } else if (callbackResult.status === 'failed') {
            booking.payment.status = 'failed';
            await booking.save();
            console.log(`Payment failed for booking ${booking.bookingReference}`);
        } else if (callbackResult.status === 'cancelled') {
            booking.payment.status = 'cancelled';
            await booking.save();
            console.log(`Payment cancelled for booking ${booking.bookingReference}`);
        }

        // Respond with success to acknowledge receipt
        res.json({
            success: true,
            code: '0',
            msg: 'Callback processed successfully'
        });

    } catch (error) {
        console.error('Telebirr callback error:', error);
        res.status(500).json({
            success: false,
            message: 'Callback processing failed'
        });
    }
});

// ========================================
// GET /api/payments/telebirr/status/:outTradeNo - Query Telebirr payment status
// ========================================
router.get('/telebirr/status/:outTradeNo', async (req, res) => {
    try {
        const { outTradeNo } = req.params;

        // First check our database
        const booking = await Booking.findOne({
            'payment.transactionId': outTradeNo
        }).select('payment bookingReference');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // If configured, also query Telebirr directly
        let telebirrStatus = null;
        if (telebirrService.isConfigured()) {
            try {
                telebirrStatus = await telebirrService.queryPaymentStatus(outTradeNo);
            } catch (err) {
                console.log('Could not query Telebirr status:', err.message);
            }
        }

        res.json({
            success: true,
            data: {
                bookingReference: booking.bookingReference,
                outTradeNo: outTradeNo,
                localStatus: booking.payment.status,
                telebirrStatus: telebirrStatus?.status || null,
                paidAt: booking.payment.paidAt
            }
        });

    } catch (error) {
        console.error('Query Telebirr status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to query payment status'
        });
    }
});

// ========================================
// GET /api/payments/:bookingId - Get payment status
// ========================================
router.get('/:bookingId',
    optionalAuth,
    [
        param('bookingId').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOne({
                $or: [
                    { _id: bookingId },
                    { bookingReference: bookingId.toUpperCase() }
                ]
            }).select('payment bookingReference pricing');

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            res.json({
                success: true,
                data: {
                    bookingReference: booking.bookingReference,
                    payment: booking.payment,
                    pricing: booking.pricing
                }
            });

        } catch (error) {
            console.error('Get payment status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment status'
            });
        }
    }
);

module.exports = router;
