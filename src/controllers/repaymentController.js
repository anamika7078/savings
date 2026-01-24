const repaymentService = require('../services/repaymentService');
const logger = require('../config/logger');

class RepaymentController {
    async getAllRepayments(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                memberId: req.query.memberId,
                loanId: req.query.loanId,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const result = await repaymentService.getAllRepayments(page, limit, filters);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Get all repayments controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRepaymentById(req, res) {
        try {
            const { id } = req.params;
            const repayment = await repaymentService.getRepaymentById(id);

            res.json({
                success: true,
                data: repayment
            });
        } catch (error) {
            logger.error('Get repayment by ID controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async makeRepayment(req, res) {
        try {
            const { id } = req.params;
            const { paymentMethod, transactionId, remarks } = req.body;

            const repayment = await repaymentService.makeRepayment(id, {
                paymentMethod,
                transactionId,
                remarks
            });

            res.json({
                success: true,
                message: 'Repayment processed successfully',
                data: repayment
            });
        } catch (error) {
            logger.error('Make repayment controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getOverdueRepayments(req, res) {
        try {
            const overdueRepayments = await repaymentService.getOverdueRepayments();

            res.json({
                success: true,
                data: overdueRepayments
            });
        } catch (error) {
            logger.error('Get overdue repayments controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRepaymentStatistics(req, res) {
        try {
            const statistics = await repaymentService.getRepaymentStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get repayment statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async generateRepaymentSchedule(req, res) {
        try {
            const { loanId } = req.params;

            if (!loanId) {
                return res.status(400).json({
                    success: false,
                    message: 'Loan ID is required'
                });
            }

            const schedule = await repaymentService.generateRepaymentSchedule(loanId);

            res.json({
                success: true,
                data: schedule
            });
        } catch (error) {
            logger.error('Generate repayment schedule controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateRepayment(req, res) {
        try {
            const { id } = req.params;
            const repayment = await repaymentService.updateRepayment(id, req.body);

            res.json({
                success: true,
                message: 'Repayment updated successfully',
                data: repayment
            });
        } catch (error) {
            logger.error('Update repayment controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new RepaymentController();
