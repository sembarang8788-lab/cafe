const { Sequelize } = require('sequelize');
require('dotenv').config();

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false, // Set true untuk debug SQL queries
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Successfully connected to PostgreSQL via Sequelize!');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
    }
};

testConnection();

module.exports = sequelize;
