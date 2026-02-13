const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        logger.warn('Validation error:', { errors: errorMessages, body: req.body });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessages
        });
    }
    next();
};

const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('role')
        .optional()
        .isIn(['admin', 'user'])
        .withMessage('Role must be either admin or user'),
    handleValidationErrors
];

const validateMember = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('dateOfBirth')
        .isISO8601()
        .withMessage('Please provide a valid date of birth'),
    body('occupation')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Occupation must not exceed 100 characters'),
    body('monthlyIncome')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Monthly income must be a positive number'),
    handleValidationErrors
];

const validateLoan = [
    body('memberId')
        .isMongoId()
        .withMessage('Member ID must be a valid MongoDB ObjectId'),
    body('principalAmount')
        .isFloat({ min: 100 })
        .withMessage('Principal amount must be at least 100'),
    body('monthlyPrincipalPayment')
        .isFloat({ min: 1 })
        .withMessage('Monthly principal payment must be greater than 0'),
    body('interestRate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Interest rate must be between 0 and 100'),
    body('purpose')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Purpose must not exceed 200 characters'),
    body('collateral')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Collateral must not exceed 200 characters'),
    body('guarantor')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Guarantor must not exceed 200 characters'),
    handleValidationErrors
];

const validateSavings = [
    body('memberId')
        .isMongoId()
        .withMessage('Member ID must be a valid MongoDB ObjectId'),
    body('accountType')
        .isIn(['regular', 'fixed', 'recurring'])
        .withMessage('Account type must be regular, fixed, or recurring'),
    body('minimumBalance')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum balance must be a positive number'),
    body('monthlyContribution')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Monthly contribution must be a positive number'),
    handleValidationErrors
];

module.exports = {
    validateLogin,
    validateRegister,
    validateMember,
    validateLoan,
    validateSavings,
    handleValidationErrors
};
