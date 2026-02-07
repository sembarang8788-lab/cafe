const express = require('express');
const router = express.Router();
const { User } = require('../models');
const crypto = require('crypto');

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'created_at'],
            order: [['created_at', 'DESC']]
        });
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: ['id', 'username', 'email', 'role', 'created_at']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Create new user (Register)
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Simple password hashing (for production, use bcrypt)
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'cashier'
        });

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        const user = await User.findOne({
            where: { username, password: hashedPassword },
            attributes: ['id', 'username', 'email', 'role', 'created_at']
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: user
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.update({ username, email, role });

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.destroy();

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
