const authService = require('../services/authService');
const logger = require('../config/logger');

class AuthController {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            const result = await authService.login(username, password);

            res.json({
                success: true,
                message: 'Login successful',
                data: result
            });
        } catch (error) {
            logger.error('Login controller error:', error);
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    async register(req, res) {
        try {
            const result = await authService.register(req.body);

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: result
            });
        } catch (error) {
            logger.error('Register controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getCurrentUser(req, res) {
        try {
            const user = await authService.getCurrentUser(req.user.id);

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            logger.error('Get current user controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateProfile(req, res) {
        try {
            const user = await authService.updateProfile(req.user.id, req.body);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: user
            });
        } catch (error) {
            logger.error('Update profile controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Change password controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async logout(req, res) {
        try {
            logger.info(`User logged out: ${req.user.username}`);

            res.json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error) {
            logger.error('Logout controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }
}

module.exports = new AuthController();
