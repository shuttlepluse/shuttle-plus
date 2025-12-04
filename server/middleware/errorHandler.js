// ========================================
// Error Handler Middleware
// ========================================

// 404 Not Found handler
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Sanitize error messages to prevent credential exposure
const sanitizeErrorMessage = (message) => {
    if (!message) return 'An error occurred';

    // Patterns that might contain sensitive info
    const sensitivePatterns = [
        /mongodb\+srv:\/\/[^@]+@/gi,  // MongoDB connection strings
        /mongodb:\/\/[^@]+@/gi,
        /bad auth.*authentication failed/gi,
        /authentication failed/gi,
        /_db_user/gi,
        /password/gi,
    ];

    for (const pattern of sensitivePatterns) {
        if (pattern.test(message)) {
            return 'Database connection error. Please try again later.';
        }
    }

    return message;
};

// Global error handler
const errorHandler = (err, req, res, next) => {
    // Log error for debugging (full details server-side only)
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });

    // Determine status code
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let safeMessage = err.message;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
    } else if (err.name === 'CastError') {
        statusCode = 400;
        safeMessage = 'Invalid ID format';
    } else if (err.code === 11000) {
        statusCode = 400;
        safeMessage = 'Duplicate entry';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        safeMessage = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        safeMessage = 'Token expired';
    } else if (err.name === 'MongoServerError' || err.name === 'MongoError') {
        statusCode = 500;
        safeMessage = 'Database error. Please try again later.';
    }

    // Sanitize the message before sending to client
    safeMessage = sanitizeErrorMessage(safeMessage);

    res.status(statusCode).json({
        success: false,
        message: safeMessage,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack
        })
    });
};

module.exports = {
    notFound,
    errorHandler
};
