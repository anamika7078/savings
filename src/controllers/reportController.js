const reportService = require('../services/reportService');
const logger = require('../config/logger');

class ReportController {
    async getDashboardStatistics(req, res) {
        try {
            const statistics = await reportService.getDashboardStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get dashboard statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getLoanPerformanceReport(req, res) {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
            }

            const report = await reportService.getLoanPerformanceReport(startDate, endDate);

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            logger.error('Get loan performance report controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getMemberWiseReport(req, res) {
        try {
            const { memberId } = req.params;

            if (!memberId) {
                return res.status(400).json({
                    success: false,
                    message: 'Member ID is required'
                });
            }

            const report = await reportService.getMemberWiseReport(memberId);

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            logger.error('Get member wise report controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async getFinancialSummary(req, res) {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
            }

            const summary = await reportService.getFinancialSummary(startDate, endDate);

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            logger.error('Get financial summary controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async exportReport(req, res) {
        try {
            const { type, startDate, endDate, memberId } = req.query;

            let reportData;

            switch (type) {
                case 'loan-performance':
                    reportData = await reportService.getLoanPerformanceReport(startDate, endDate);
                    break;
                case 'member-wise':
                    reportData = await reportService.getMemberWiseReport(memberId);
                    break;
                case 'financial-summary':
                    reportData = await reportService.getFinancialSummary(startDate, endDate);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid report type'
                    });
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${Date.now()}.json"`);

            res.json({
                success: true,
                reportType: type,
                generatedAt: new Date().toISOString(),
                data: reportData
            });
        } catch (error) {
            logger.error('Export report controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new ReportController();
