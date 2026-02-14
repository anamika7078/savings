const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

class AuthService {
    generateToken(user) {
        return jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }

    async login(username, password) {
        try {
            const user = await User.findOne({ username });

            if (!user) {
                throw new Error('Invalid credentials');
            }

            if (!user.isActive) {
                throw new Error('Account is deactivated');
            }

            const isValidPassword = await user.validatePassword(password);

            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            user.lastLogin = new Date();
            await user.save();

            logger.info(`User logged in: ${user.username}`);

            return {
                user: user.toJSON()
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const existingUser = await User.findOne({
                $or: [
                    { username: userData.username },
                    { email: userData.email }
                ]
            });

            if (existingUser) {
                throw new Error('Username or email already exists');
            }

            const user = await User.create({
                username: userData.username,
                email: userData.email,
                password: userData.password,
                role: userData.role || 'user'
            });

            logger.info(`New user registered: ${user.username}`);

            return {
                user: user.toJSON()
            };
        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    async getCurrentUser(userId) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            return user.toJSON();
        } catch (error) {
            logger.error('Get current user error:', error);
            throw error;
        }
    }

    async updateProfile(userId, updateData) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            if (updateData.email && updateData.email !== user.email) {
                const existingUser = await User.findOne({ email: updateData.email });

                if (existingUser) {
                    throw new Error('Email already exists');
                }
            }

            Object.assign(user, updateData);
            await user.save();

            logger.info(`User profile updated: ${user.username}`);

            return user.toJSON();
        } catch (error) {
            logger.error('Update profile error:', error);
            throw error;
        }
    }

    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            const isValidPassword = await user.validatePassword(currentPassword);

            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            user.password = newPassword;
            await user.save();

            logger.info(`Password changed for user: ${user.username}`);

            return { message: 'Password changed successfully' };
        } catch (error) {
            logger.error('Change password error:', error);
            throw error;
        }
    }
}

module.exports = new AuthService();
