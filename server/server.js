// ========================================
// SHUTTLE PLUS - Express Server
// ========================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookingRoutes = require('./routes/bookings');
const flightRoutes = require('./routes/flights');
const pricingRoutes = require('./routes/pricing');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const configRoutes = require('./routes/config');
const corporateRoutes = require('./routes/corporate');
const analyticsRoutes = require('./routes/analytics');
const auditRoutes = require('./routes/audit');
const groupRoutes = require('./routes/groups');
const partnerRoutes = require('./routes/partners');
const driverRoutes = require('./routes/drivers');
const adminRoutes = require('./routes/admin');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimit');

// Initialize Express app
const app = express();

// ========================================
// Middleware
// ========================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Parse allowed origins from env
        const allowedOrigins = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
            : ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'];

        // In development, allow all localhost variants
        if (process.env.NODE_ENV !== 'production') {
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }
        }

        // Check if origin is allowed
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours preflight cache
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Compression
app.use(compression());

// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimiter);

// ========================================
// Static Files (for PWA)
// ========================================
app.use(express.static(path.join(__dirname, '..')));

// ========================================
// API Routes
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/corporate', corporateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Shuttle Plus API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            bookings: '/api/bookings',
            flights: '/api/flights',
            pricing: '/api/pricing',
            payments: '/api/payments',
            notifications: '/api/notifications',
            config: '/api/config'
        }
    });
});

// ========================================
// SPA Fallback (for PWA routing)
// ========================================
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ========================================
// Error Handling
// ========================================
app.use(notFound);
app.use(errorHandler);

// ========================================
// Server Startup
// ========================================
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to database
        await connectDB();
        console.log('✓ Database connected');

        // Start server
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚗 Shuttle Plus Server                         ║
║                                                   ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(33)}║
║   Port: ${PORT.toString().padEnd(41)}║
║   API: http://localhost:${PORT}/api${' '.repeat(22)}║
║                                                   ║
╚═══════════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
