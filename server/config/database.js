// ========================================
// Database Configuration (MongoDB)
// ========================================
//
// MongoDB Atlas Setup Instructions:
// 1. Go to https://www.mongodb.com/cloud/atlas
// 2. Create a free M0 cluster (512MB storage)
// 3. Create a database user with password
// 4. Add IP address 0.0.0.0/0 to whitelist (or your specific IPs)
// 5. Get connection string: mongodb+srv://user:pass@cluster.mongodb.net/shuttleplus
// 6. Add to .env: MONGODB_URI=your-connection-string
//
// ========================================

const mongoose = require('mongoose');

let mongoServer = null;
let isMemoryMode = false;

const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI;

    // Use MongoDB Memory Server if no URI provided (development mode)
    if (!mongoUri || mongoUri.trim() === '') {
        isMemoryMode = true;
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║  ⚠  DEVELOPMENT MODE - In-Memory MongoDB Active            ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║  Data will NOT persist between server restarts.            ║');
        console.log('║                                                            ║');
        console.log('║  To enable persistence, add MongoDB Atlas URI to .env:     ║');
        console.log('║  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net   ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');

        try {
            // Try to use MongoDB Memory Server for development
            const { MongoMemoryServer } = require('mongodb-memory-server');
            mongoServer = await MongoMemoryServer.create();
            const memoryUri = mongoServer.getUri();

            await mongoose.connect(memoryUri, {
                dbName: 'shuttleplus'
            });

            console.log('✓ MongoDB Memory Server connected');
            return;
        } catch (err) {
            console.log('⚠ MongoDB Memory Server not available, using mock mode');
            console.log('  Install with: npm install mongodb-memory-server --save-dev');
            return;
        }
    }

    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(mongoUri, options);

        console.log(`MongoDB Connected: ${mongoose.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        console.log('Falling back to in-memory storage for development');
        // Exit process with failure in production
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

// Check if MongoDB is connected
const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

// Check if using in-memory mode
const isMemoryModeActive = () => isMemoryMode;

module.exports = connectDB;
module.exports.isConnected = isConnected;
module.exports.isMemoryMode = isMemoryModeActive;
