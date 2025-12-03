// ========================================
// Auth Routes
// ========================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimit');
const notificationService = require('../services/notificationService');

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
// POST /api/auth/register - Register new user
// ========================================
router.post('/register',
    authLimiter,
    [
        body('phone')
            .matches(/^\+251\d{9}$/)
            .withMessage('Please enter a valid Ethiopian phone number (+251...)'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { phone, name } = req.body;

            // Check if user exists
            let user = await User.findOne({ phone });

            if (user && user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already registered. Please login instead.'
                });
            }

            if (!user) {
                // Create new user
                user = new User({ phone, name });
            } else {
                // Update name if provided
                if (name) user.name = name;
            }

            // Generate OTP
            const otp = user.generateOTP();
            await user.save();

            // Send OTP via SMS
            await notificationService.sendSMS(phone, `Your Shuttle Plus verification code is: ${otp}`);

            res.status(201).json({
                success: true,
                message: 'Verification code sent to your phone',
                data: {
                    phone: user.phone,
                    requiresVerification: true
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Registration failed. Please try again.'
            });
        }
    }
);

// ========================================
// POST /api/auth/login - Login (request OTP)
// ========================================
router.post('/login',
    authLimiter,
    [
        body('phone')
            .matches(/^\+251\d{9}$/)
            .withMessage('Please enter a valid Ethiopian phone number (+251...)')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { phone } = req.body;

            let user = await User.findOne({ phone });

            if (!user) {
                // Auto-register for convenience
                user = new User({ phone });
            }

            // Generate OTP
            const otp = user.generateOTP();
            await user.save();

            // Send OTP via SMS
            await notificationService.sendSMS(phone, `Your Shuttle Plus login code is: ${otp}`);

            res.json({
                success: true,
                message: 'Verification code sent to your phone',
                data: {
                    phone: user.phone,
                    isNewUser: !user.isVerified
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed. Please try again.'
            });
        }
    }
);

// ========================================
// POST /api/auth/verify-otp - Verify OTP
// ========================================
router.post('/verify-otp',
    otpLimiter,
    [
        body('phone')
            .matches(/^\+251\d{9}$/)
            .withMessage('Please enter a valid phone number'),
        body('otp')
            .isLength({ min: 6, max: 6 })
            .isNumeric()
            .withMessage('OTP must be 6 digits')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { phone, otp } = req.body;

            const user = await User.findOne({ phone });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found. Please register first.'
                });
            }

            if (!user.verifyOTP(otp)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification code'
                });
            }

            // Clear OTP and mark as verified
            user.clearOTP();
            user.isVerified = true;
            user.lastLogin = new Date();
            await user.save();

            // Generate token
            const token = generateToken(user._id);

            res.json({
                success: true,
                message: 'Verification successful',
                data: {
                    token,
                    user: user.toJSON()
                }
            });

        } catch (error) {
            console.error('OTP verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Verification failed. Please try again.'
            });
        }
    }
);

// ========================================
// POST /api/auth/resend-otp - Resend OTP
// ========================================
router.post('/resend-otp',
    otpLimiter,
    [
        body('phone')
            .matches(/^\+251\d{9}$/)
            .withMessage('Please enter a valid phone number')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { phone } = req.body;

            const user = await User.findOne({ phone });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Generate new OTP
            const otp = user.generateOTP();
            await user.save();

            // Send OTP
            await notificationService.sendSMS(phone, `Your Shuttle Plus verification code is: ${otp}`);

            res.json({
                success: true,
                message: 'New verification code sent'
            });

        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resend code. Please try again.'
            });
        }
    }
);

// ========================================
// GET /api/auth/me - Get current user
// ========================================
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user.toJSON()
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data'
        });
    }
});

// ========================================
// POST /api/auth/logout - Logout
// ========================================
router.post('/logout', authenticate, async (req, res) => {
    try {
        // In a more complex setup, you'd invalidate the token here
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

module.exports = router;
