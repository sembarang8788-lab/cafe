const express = require('express');
const router = express.Router();
const { sequelize, Order, OrderItem, Product } = require('../models');

// Get all orders
router.get('/', async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [{
                model: OrderItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name']
                }]
            }],
            order: [['created_at', 'DESC']]
        });

        // Format response to match previous API structure
        const formattedOrders = orders.map(order => {
            const orderData = order.toJSON();
            orderData.items = orderData.items.map(item => ({
                id: item.id,
                product_id: item.product_id,
                product_name: item.product?.name || null,
                quantity: item.quantity,
                price: item.price
            }));
            return orderData;
        });

        res.json({
            success: true,
            data: formattedOrders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id, {
            include: [{
                model: OrderItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name']
                }]
            }]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Format response
        const orderData = order.toJSON();
        orderData.items = orderData.items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product?.name || null,
            quantity: item.quantity,
            price: item.price
        }));

        res.json({
            success: true,
            data: orderData
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Create new order
router.post('/', async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { items, total_amount, user_id } = req.body;

        // Create order
        const order = await Order.create({
            total_amount,
            user_id: user_id || null
        }, { transaction: t });

        // Add order items and update stock
        for (const item of items) {
            await OrderItem.create({
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price
            }, { transaction: t });

            // Update stock
            await Product.decrement('stock', {
                by: item.quantity,
                where: { id: item.product_id },
                transaction: t
            });
        }

        await t.commit();

        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        await t.rollback();
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get orders by date range
router.get('/report/daily', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const result = await Order.findAll({
            where: sequelize.where(
                sequelize.fn('DATE', sequelize.col('created_at')),
                targetDate
            ),
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_amount')), 0), 'total_revenue']
            ],
            raw: true
        });

        res.json({
            success: true,
            data: {
                date: targetDate,
                total_orders: result[0]?.total_orders || '0',
                total_revenue: result[0]?.total_revenue || 0
            }
        });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        await order.destroy(); // order_items will cascade

        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
