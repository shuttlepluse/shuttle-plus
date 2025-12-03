// ========================================
// Rate Limiting Middleware
// ========================================

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Very strict limiter for OTP requests
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 OTP requests per hour
    message: {
        success: false,
        message: 'Too many OTP requests, please try again in an hour'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Flight API limiter (preserve free tier)
const flightLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 flight lookups per hour
    message: {
        success: false,
        message: 'Flight lookup limit reached, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = apiLimiter;

module.exports.apiLimiter = apiLimiter;
module.exports.authLimiter = authLimiter;
module.exports.otpLimiter = otpLimiter;
module.exports.flightLimiter = flightLimiter;
