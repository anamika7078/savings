const moment = require('moment');

const generateMemberId = (id) => {
    return `MEM${String(id).padStart(4, '0')}`;
};

const generateLoanNumber = (id) => {
    return `LOAN${String(id).padStart(4, '0')}`;
};

const generateSavingsAccountNumber = (id) => {
    return `SAV${String(id).padStart(4, '0')}`;
};

const generateFineNumber = (id) => {
    return `FIN${String(id).padStart(4, '0')}`;
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

const formatDate = (date, format = 'YYYY-MM-DD') => {
    return moment(date).format(format);
};

const calculateAge = (dateOfBirth) => {
    return moment().diff(moment(dateOfBirth), 'years');
};

const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone);
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const calculateInterest = (principal, rate, time) => {
    return (principal * rate * time) / 100;
};

const calculateCompoundInterest = (principal, rate, time, frequency = 1) => {
    const amount = principal * Math.pow(1 + (rate / 100) / frequency, frequency * time);
    return amount - principal;
};

const paginate = (page, limit) => {
    const offset = (page - 1) * limit;
    return { offset, limit: parseInt(limit) };
};

const buildWhereClause = (filters) => {
    const where = {};

    Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
            if (typeof filters[key] === 'string' && key.includes('search')) {
                where[key.replace('search', '')] = {
                    [require('sequelize').Op.like]: `%${filters[key]}%`
                };
            } else {
                where[key] = filters[key];
            }
        }
    });

    return where;
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
};

const generateRandomPassword = (length = 8) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

const isOverdue = (dueDate) => {
    return moment().isAfter(moment(dueDate), 'day');
};

const getDaysOverdue = (dueDate) => {
    return moment().diff(moment(dueDate), 'days');
};

const calculateLateFee = (amount, daysLate, rate = 0.02) => {
    const maxDays = 30;
    const applicableDays = Math.min(daysLate, maxDays);
    return Math.round(amount * rate * applicableDays);
};

const maskSensitiveData = (data, fieldsToMask = ['password', 'ssn', 'creditCard']) => {
    const masked = { ...data };

    fieldsToMask.forEach(field => {
        if (masked[field]) {
            const value = masked[field].toString();
            masked[field] = value.length > 4 ?
                '*'.repeat(value.length - 4) + value.slice(-4) :
                '*'.repeat(value.length);
        }
    });

    return masked;
};

const validateDateRange = (startDate, endDate) => {
    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
        return { valid: false, message: 'Invalid date format' };
    }

    if (start.isAfter(end)) {
        return { valid: false, message: 'Start date must be before end date' };
    }

    if (start.isAfter(moment())) {
        return { valid: false, message: 'Start date cannot be in the future' };
    }

    return { valid: true };
};

module.exports = {
    generateMemberId,
    generateLoanNumber,
    generateSavingsAccountNumber,
    generateFineNumber,
    formatCurrency,
    formatDate,
    calculateAge,
    validatePhone,
    validateEmail,
    calculateInterest,
    calculateCompoundInterest,
    paginate,
    buildWhereClause,
    sanitizeInput,
    generateRandomPassword,
    isOverdue,
    getDaysOverdue,
    calculateLateFee,
    maskSensitiveData,
    validateDateRange
};
