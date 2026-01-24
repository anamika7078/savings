const express = require('express');
const router = express.Router();
const fineController = require('../controllers/fineController');
const { auth, adminAuth } = require('../middlewares/auth');
const { body } = require('express-validator');

const validateFine = [
    body('memberId')
        .isInt({ min: 1 })
        .withMessage('Member ID must be a positive integer'),
    body('type')
        .isIn(['late_payment', 'missed_meeting', 'violation', 'other'])
        .withMessage('Invalid fine type'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    require('../middlewares/validation').handleValidationErrors
];

const validatePayment = [
    body('paymentMethod')
        .isIn(['cash', 'bank_transfer', 'check', 'online'])
        .withMessage('Invalid payment method'),
    body('transactionId')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Transaction ID must not exceed 50 characters'),
    require('../middlewares/validation').handleValidationErrors
];

const validateWaiver = [
    body('waiveReason')
        .trim()
        .notEmpty()
        .withMessage('Waive reason is required')
        .isLength({ max: 500 })
        .withMessage('Waive reason must not exceed 500 characters'),
    require('../middlewares/validation').handleValidationErrors
];

router.post('/', auth, adminAuth, validateFine, fineController.createFine);
router.get('/', auth, fineController.getAllFines);
router.get('/statistics', auth, adminAuth, fineController.getFineStatistics);
router.post('/calculate-late-fines', auth, adminAuth, fineController.calculateLatePaymentFines);
router.get('/:id', auth, fineController.getFineById);
router.post('/:id/pay', auth, adminAuth, validatePayment, fineController.payFine);
router.post('/:id/waive', auth, adminAuth, validateWaiver, fineController.waiveFine);
router.put('/:id', auth, adminAuth, fineController.updateFine);

module.exports = router;
