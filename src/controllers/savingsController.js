const savingsService = require('../services/savingsService');
const logger = require('../config/logger');
const { MonthlySavings } = require('../models');

class SavingsController {
    async createSavingsAccount(req, res) {
        try {
            const savings = await savingsService.createSavingsAccount(req.body);

            res.status(201).json({
                success: true,
                message: 'Savings account created successfully',
                data: savings
            });
        } catch (error) {
            logger.error('Create savings account controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllSavingsAccounts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                accountType: req.query.accountType
            };

            const result = await savingsService.getAllSavingsAccounts(page, limit, filters);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Get all savings accounts controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getSavingsAccountById(req, res) {
        try {
            const { id } = req.params;
            const savings = await savingsService.getSavingsAccountById(id);

            res.json({
                success: true,
                data: savings
            });
        } catch (error) {
            logger.error('Get savings account by ID controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async deposit(req, res) {
        try {
            const { id } = req.params;
            const { amount, remarks } = req.body;

            const result = await savingsService.deposit(id, amount, remarks);

            res.json({
                success: true,
                message: 'Deposit successful',
                data: result
            });
        } catch (error) {
            logger.error('Deposit controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async withdraw(req, res) {
        try {
            const { id } = req.params;
            const { amount, remarks } = req.body;

            const result = await savingsService.withdraw(id, amount, remarks);

            res.json({
                success: true,
                message: 'Withdrawal successful',
                data: result
            });
        } catch (error) {
            logger.error('Withdrawal controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async calculateInterest(req, res) {
        try {
            const { id } = req.params;
            const result = await savingsService.calculateInterest(id);

            res.json({
                success: true,
                message: 'Interest calculated successfully',
                data: result
            });
        } catch (error) {
            logger.error('Calculate interest controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getSavingsStatistics(req, res) {
        try {
            const statistics = await savingsService.getSavingsStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get savings statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateSavingsAccount(req, res) {
        try {
            const { id } = req.params;
            const savings = await savingsService.updateSavingsAccount(id, req.body);

            res.json({
                success: true,
                message: 'Savings account updated successfully',
                data: savings
            });
        } catch (error) {
            logger.error('Update savings account controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Monthly Savings Methods
    async createMonthlySavingsEntry(req, res) {
        try {
            const { memberId, savingMonth, savingYear, monthlyFixedAmount, fine, totalPayableAmount, paymentStatus, paymentDate, remarks, carryForwardAmount } = req.body;

            // Check for duplicate entry
            const existingEntry = await MonthlySavings.findOne({
                memberId,
                savingMonth,
                savingYear
            });

            if (existingEntry) {
                return res.status(400).json({
                    success: false,
                    message: 'Savings entry for this member, month, and year already exists'
                });
            }

            const monthlySavings = await MonthlySavings.create({
                memberId,
                savingMonth,
                savingYear,
                monthlyFixedAmount,
                fine: fine || 0,
                carryForwardAmount: carryForwardAmount || 0,
                totalPayableAmount,
                paymentStatus: paymentStatus || 'unpaid',
                paymentDate: paymentStatus === 'paid' ? paymentDate : null,
                remarks
            });

            res.status(201).json({
                success: true,
                message: 'Monthly savings entry created successfully',
                data: monthlySavings
            });
        } catch (error) {
            logger.error('Create monthly savings entry controller error:', error);

            // Handle MongoDB duplicate key error
            if (error.code === 11000) { // MongoDB duplicate key error code
                return res.status(400).json({
                    success: false,
                    message: 'Savings entry for this member, month, and year already exists'
                });
            }

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async checkDuplicateMonthlyEntry(req, res) {
        try {
            const { memberId, savingMonth, savingYear } = req.body;

            const existingEntry = await MonthlySavings.findOne({
                memberId,
                savingMonth,
                savingYear
            });

            res.json({
                success: true,
                exists: !!existingEntry,
                data: existingEntry
            });
        } catch (error) {
            logger.error('Check duplicate monthly entry controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getMemberMonthSavings(req, res) {
        try {
            const { memberId, month, year } = req.params;

            const monthlySavings = await MonthlySavings.findOne({
                memberId,
                savingMonth: month,
                savingYear: year
            });

            res.json({
                success: true,
                data: monthlySavings
            });
        } catch (error) {
            logger.error('Get member month savings controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllMonthlySavings(req, res) {
        try {
            console.log('MonthlySavings model:', MonthlySavings);
            console.log('MonthlySavings.find:', typeof MonthlySavings.find);

            const page = parseInt(req.query.page) || 1;
            // Increase default limit to 1000 to get all records, or use limit from query
            const limit = parseInt(req.query.limit) || 1000;
            const offset = (page - 1) * limit;

            const filters = {
                memberId: req.query.memberId,
                paymentStatus: req.query.paymentStatus,
                savingMonth: req.query.savingMonth,
                savingYear: req.query.savingYear
            };

            const whereClause = {};
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    whereClause[key] = filters[key];
                }
            });

            console.log('Where clause:', whereClause);
            console.log('Query params:', req.query);

            const monthlySavings = await MonthlySavings.find(whereClause)
                .populate('memberId', 'firstName lastName memberId')
                .limit(limit)
                .skip(offset)
                .sort({ savingYear: -1, savingMonth: -1, createdAt: -1 });

            const count = await MonthlySavings.countDocuments(whereClause);

            console.log(`Found ${monthlySavings.length} monthly savings records out of ${count} total`);

            res.json({
                success: true,
                data: {
                    monthlySavings,
                    pagination: {
                        page,
                        limit,
                        total: count,
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get all monthly savings controller error:', error);
            logger.error('Get all monthly savings controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new SavingsController();
