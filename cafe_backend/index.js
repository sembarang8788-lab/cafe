const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

// Use routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: '☕ Cafe Backend API is running!',
        version: '1.0.0',
        orm: 'Sequelize',
        endpoints: {
            products: '/api/products',
            orders: '/api/orders',
            users: '/api/users'
        }
    });
});

// Health check for database
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'healthy',
            database: 'connected',
            orm: 'Sequelize',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Global error handler middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error(err.stack);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});

// Start server
const startServer = async () => {
    try {
        // Sync database (won't drop existing tables)
        await sequelize.sync({ alter: false });
        console.log('✅ Database synced!');

        app.listen(PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📦 API Endpoints:`);
            console.log(`   - Products: http://localhost:${PORT}/api/products`);
            console.log(`   - Orders:   http://localhost:${PORT}/api/orders`);
            console.log(`   - Users:    http://localhost:${PORT}/api/users`);
            console.log(`   - Health:   http://localhost:${PORT}/health\n`);
        });
    } catch (error) {
        console.error('❌ Unable to start server:', error);
    }
};

startServer();
