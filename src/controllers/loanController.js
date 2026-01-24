const loanService = require('../services/loanService');
const logger = require('../config/logger');

class LoanController {
    async createLoanApplication(req, res) {
        try {
            const loan = await loanService.createLoanApplication(req.body);

            res.status(201).json({
                success: true,
                message: 'Loan application created successfully',
                data: loan
            });
        } catch (error) {
            logger.error('Create loan application controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllLoans(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                memberId: req.query.memberId
            };

            const result = await loanService.getAllLoans(page, limit, filters);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Get all loans controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getLoanById(req, res) {
        try {
            const { id } = req.params;
            const loan = await loanService.getLoanById(id);

            res.json({
                success: true,
                data: loan
            });
        } catch (error) {
            logger.error('Get loan by ID controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async approveLoan(req, res) {
        try {
            const { id } = req.params;
            const loan = await loanService.approveLoan(id);

            res.json({
                success: true,
                message: 'Loan approved successfully',
                data: loan
            });
        } catch (error) {
            logger.error('Approve loan controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async disburseLoan(req, res) {
        try {
            const { id } = req.params;
            const { disbursementDate } = req.body;
            const loan = await loanService.disburseLoan(id, disbursementDate);

            res.json({
                success: true,
                message: 'Loan disbursed successfully',
                data: loan
            });
        } catch (error) {
            logger.error('Disburse loan controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async makeRepayment(req, res) {
        try {
            const { repaymentId } = req.params;
            const { paymentMethod, transactionId } = req.body;

            const result = await loanService.makeRepayment(repaymentId, paymentMethod, transactionId);

            res.json({
                success: true,
                message: 'Repayment processed successfully',
                data: result
            });
        } catch (error) {
            logger.error('Make repayment controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getLoanStatistics(req, res) {
        try {
            const statistics = await loanService.getLoanStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get loan statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new LoanController();
