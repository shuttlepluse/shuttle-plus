// ========================================
// Authentication Middleware
// ========================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'shuttleplus-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// Verify token and attach user to request
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-otp');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            req.user = user;
            req.userId = user._id;
            next();

        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findById(decoded.userId).select('-otp');
                if (user) {
                    req.user = user;
                    req.userId = user._id;
                }
            } catch (jwtError) {
                // Token invalid, but we don't fail - just continue without user
            }
        }

        next();

    } catch (error) {
        console.error('Optional auth error:', error);
        next();
    }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Check if user is driver
const requireDriver = (req, res, next) => {
    if (!req.user || req.user.role !== 'driver') {
        return res.status(403).json({
            success: false,
            message: 'Driver access required'
        });
    }
    next();
};

module.exports = {
    generateToken,
    authenticate,
    optionalAuth,
    requireAdmin,
    requireDriver,
    JWT_SECRET
};
