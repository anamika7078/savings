const express = require('express');
const router = express.Router();
const repaymentController = require('../controllers/repaymentController');
const { auth, adminAuth } = require('../middlewares/auth');
const { body, query } = require('express-validator');

const validateRepayment = [
    body('paymentMethod')
        .isIn(['cash', 'bank_transfer', 'check', 'online'])
        .withMessage('Invalid payment method'),
    body('transactionId')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Transaction ID must not exceed 50 characters'),
    body('remarks')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Remarks must not exceed 500 characters'),
    require('../middlewares/validation').handleValidationErrors
];

const validateDateRange = [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    require('../middlewares/validation').handleValidationErrors
];

router.get('/', auth, validateDateRange, repaymentController.getAllRepayments);
router.get('/overdue', auth, adminAuth, repaymentController.getOverdueRepayments);
router.get('/statistics', auth, adminAuth, repaymentController.getRepaymentStatistics);
router.get('/schedule/:loanId', auth, repaymentController.generateRepaymentSchedule);
router.get('/:id', auth, repaymentController.getRepaymentById);
router.post('/:id/pay', auth, validateRepayment, repaymentController.makeRepayment);
router.put('/:id', auth, adminAuth, repaymentController.updateRepayment);

module.exports = router;
