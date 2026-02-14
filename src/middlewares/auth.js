const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

const auth = async (req, res, next) => {
    try {
        // Token authentication removed - allow all requests
        // You can add session-based auth or other authentication here if needed
        req.user = { role: 'user' }; // Default user for now
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

module.exports = { auth, adminAuth };
