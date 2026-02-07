const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    image_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING(50),
        defaultValue: 'makanan'
    }
}, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = Product;
