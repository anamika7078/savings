const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const { auth, adminAuth } = require('../middlewares/auth');
const { validateSavings } = require('../middlewares/validation');
const { body } = require('express-validator');

const validateTransaction = [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('remarks')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Remarks must not exceed 500 characters'),
    require('../middlewares/validation').handleValidationErrors
];

const validateMonthlySavings = [
    body('memberId')
        .isMongoId()
        .withMessage('Member ID must be a valid MongoDB ObjectId'),
    body('savingMonth')
        .matches(/^(0[1-9]|1[0-2])$/)
        .withMessage('Month must be between 01 and 12'),
    body('savingYear')
        .matches(/^\d{4}$/)
        .withMessage('Year must be a 4-digit number'),
    body('monthlyFixedAmount')
        .isFloat({ min: 1 })
        .withMessage('Monthly fixed amount must be greater than 0'),
    body('totalPayableAmount')
        .isFloat({ min: 1 })
        .withMessage('Total payable amount must be greater than 0'),
    body('paymentStatus')
        .isIn(['paid', 'unpaid'])
        .withMessage('Payment status must be either paid or unpaid'),
    body('paymentDate')
        .if(body('paymentStatus').equals('paid'))
        .isISO8601()
        .withMessage('Payment date is required when status is paid'),
    body('remarks')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Remarks must not exceed 1000 characters'),
    require('../middlewares/validation').handleValidationErrors
];

// Original savings account routes
router.post('/', auth, adminAuth, validateSavings, savingsController.createSavingsAccount);
router.get('/', auth, savingsController.getAllSavingsAccounts);
router.get('/statistics', auth, adminAuth, savingsController.getSavingsStatistics);
router.get('/:id', auth, savingsController.getSavingsAccountById);
router.post('/:id/deposit', auth, adminAuth, validateTransaction, savingsController.deposit);
router.post('/:id/withdraw', auth, adminAuth, validateTransaction, savingsController.withdraw);
router.post('/:id/calculate-interest', auth, adminAuth, savingsController.calculateInterest);
router.put('/:id', auth, adminAuth, savingsController.updateSavingsAccount);

// Monthly savings routes
router.post('/monthly', auth, adminAuth, validateMonthlySavings, savingsController.createMonthlySavingsEntry);
router.post('/check-duplicate', auth, savingsController.checkDuplicateMonthlyEntry);
router.get('/monthly/all', auth, savingsController.getAllMonthlySavings);
router.get('/member/:memberId/month/:month/year/:year', auth, savingsController.getMemberMonthSavings);

module.exports = router;
