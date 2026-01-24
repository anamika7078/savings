const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { auth, adminAuth } = require('../middlewares/auth');
const { query } = require('express-validator');

const validateDateRange = [
    query('startDate')
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    query('endDate')
        .isISO8601()
        .withMessage('End date must be a valid date'),
    require('../middlewares/validation').handleValidationErrors
];

router.get('/dashboard', auth, reportController.getDashboardStatistics);
router.get('/loan-performance', auth, adminAuth, validateDateRange, reportController.getLoanPerformanceReport);
router.get('/member-wise/:memberId', auth, reportController.getMemberWiseReport);
router.get('/financial-summary', auth, adminAuth, validateDateRange, reportController.getFinancialSummary);
router.get('/export', auth, adminAuth, reportController.exportReport);

module.exports = router;
