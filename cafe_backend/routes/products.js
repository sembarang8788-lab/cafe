const express = require('express');
const router = express.Router();
const { Product } = require('../models');

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Create new product
router.post('/', async (req, res) => {
    try {
        const { name, price, stock, image_url, category } = req.body;

        const product = await Product.create({
            name,
            price,
            stock: stock || 0,
            image_url,
            category: category || 'makanan'
        });

        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock, image_url, category } = req.body;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await product.update({
            name,
            price,
            stock,
            image_url,
            category: category || 'makanan'
        });

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update stock only
router.patch('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await product.update({ stock });

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await product.destroy();

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
