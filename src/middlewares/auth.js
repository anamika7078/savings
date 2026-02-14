const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

const auth = async (req, res, next) => {
    try {
        // Check multiple ways the token might be sent
        let token = req.header('Authorization')?.replace('Bearer ', '');
        
        // Also check query parameter (for testing, not recommended for production)
        if (!token && req.query.token) {
            token = req.query.token;
        }

        // Log for debugging (remove in production or use logger)
        if (!token) {
            logger.warn('Auth failed - No token provided', {
                url: req.url,
                method: req.method,
                headers: {
                    authorization: req.header('Authorization') ? 'Present' : 'Missing',
                    origin: req.header('Origin'),
                    referer: req.header('Referer')
                }
            });
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or user not found.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token.'
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
