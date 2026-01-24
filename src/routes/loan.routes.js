const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { auth, adminAuth } = require('../middlewares/auth');
const { validateLoan } = require('../middlewares/validation');
const { body } = require('express-validator');

const validateRepayment = [
    body('paymentMethod')
        .isIn(['cash', 'bank_transfer', 'check', 'online'])
        .withMessage('Invalid payment method'),
    body('transactionId')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Transaction ID must not exceed 50 characters'),
    require('../middlewares/validation').handleValidationErrors
];

router.post('/', auth, adminAuth, validateLoan, loanController.createLoanApplication);
router.get('/', auth, loanController.getAllLoans);
router.get('/statistics', auth, adminAuth, loanController.getLoanStatistics);
router.get('/:id', auth, loanController.getLoanById);
router.put('/:id/approve', auth, adminAuth, loanController.approveLoan);
router.put('/:id/disburse', auth, adminAuth, loanController.disburseLoan);
router.post('/repayments/:repaymentId', auth, adminAuth, validateRepayment, loanController.makeRepayment);

module.exports = router;
