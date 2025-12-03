// ========================================
// User Routes
// ========================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

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
// GET /api/users/me - Get current user profile
// ========================================
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user.toJSON()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

// ========================================
// PUT /api/users/me - Update user profile
// ========================================
router.put('/me',
    authenticate,
    [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('email')
            .optional()
            .isEmail()
            .normalizeEmail()
            .withMessage('Please enter a valid email'),
        body('preferredLanguage')
            .optional()
            .isIn(['en', 'am'])
            .withMessage('Language must be en or am')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { name, email, preferredLanguage } = req.body;
            const user = req.user;

            if (name) user.name = name;
            if (email) user.email = email;
            if (preferredLanguage) user.preferredLanguage = preferredLanguage;

            await user.save();

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: user.toJSON()
            });

        } catch (error) {
            console.error('Update profile error:', error);

            // Handle duplicate email
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }
    }
);

// ========================================
// PUT /api/users/me/notifications - Update notification preferences
// ========================================
router.put('/me/notifications',
    authenticate,
    [
        body('push').optional().isBoolean(),
        body('sms').optional().isBoolean(),
        body('whatsapp').optional().isBoolean(),
        body('email').optional().isBoolean()
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { push, sms, whatsapp, email } = req.body;
            const user = req.user;

            if (typeof push === 'boolean') user.notificationPreferences.push = push;
            if (typeof sms === 'boolean') user.notificationPreferences.sms = sms;
            if (typeof whatsapp === 'boolean') user.notificationPreferences.whatsapp = whatsapp;
            if (typeof email === 'boolean') user.notificationPreferences.email = email;

            await user.save();

            res.json({
                success: true,
                message: 'Notification preferences updated',
                data: {
                    notificationPreferences: user.notificationPreferences
                }
            });

        } catch (error) {
            console.error('Update notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notification preferences'
            });
        }
    }
);

// ========================================
// DELETE /api/users/me - Delete account
// ========================================
router.delete('/me', authenticate, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.userId);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account'
        });
    }
});

module.exports = router;
