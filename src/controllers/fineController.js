const fineService = require('../services/fineService');
const logger = require('../config/logger');

class FineController {
    async createFine(req, res) {
        try {
            const fine = await fineService.createFine(req.body);

            res.status(201).json({
                success: true,
                message: 'Fine created successfully',
                data: fine
            });
        } catch (error) {
            logger.error('Create fine controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllFines(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                type: req.query.type,
                memberId: req.query.memberId
            };

            const result = await fineService.getAllFines(page, limit, filters);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Get all fines controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getFineById(req, res) {
        try {
            const { id } = req.params;
            const fine = await fineService.getFineById(id);

            res.json({
                success: true,
                data: fine
            });
        } catch (error) {
            logger.error('Get fine by ID controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async payFine(req, res) {
        try {
            const { id } = req.params;
            const { paymentMethod, transactionId } = req.body;

            const fine = await fineService.payFine(id, paymentMethod, transactionId);

            res.json({
                success: true,
                message: 'Fine paid successfully',
                data: fine
            });
        } catch (error) {
            logger.error('Pay fine controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async waiveFine(req, res) {
        try {
            const { id } = req.params;
            const { waiveReason } = req.body;

            const fine = await fineService.waiveFine(id, waiveReason, req.user.id);

            res.json({
                success: true,
                message: 'Fine waived successfully',
                data: fine
            });
        } catch (error) {
            logger.error('Waive fine controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async calculateLatePaymentFines(req, res) {
        try {
            const fines = await fineService.calculateLatePaymentFines();

            res.json({
                success: true,
                message: 'Late payment fines calculated successfully',
                data: fines
            });
        } catch (error) {
            logger.error('Calculate late payment fines controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getFineStatistics(req, res) {
        try {
            const statistics = await fineService.getFineStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get fine statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateFine(req, res) {
        try {
            const { id } = req.params;
            const fine = await fineService.updateFine(id, req.body);

            res.json({
                success: true,
                message: 'Fine updated successfully',
                data: fine
            });
        } catch (error) {
            logger.error('Update fine controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new FineController();
