const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Loan = sequelize.define('Loan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Members',
            key: 'id'
        }
    },
    loanNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    principalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    interestRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 10.00
    },
    loanTerm: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Loan term in months'
    },
    monthlyPrincipalPayment: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Fixed principal amount paid each month'
    },
    penaltyAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Monthly penalty amount applied to each payment'
    },
    totalInterestAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Total interest payable over loan term'
    },
    totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Total amount payable (principal + interest)'
    },
    amountPaid: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    principalPaid: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total principal amount paid so far'
    },
    interestPaid: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total interest amount paid so far'
    },
    remainingPrincipal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Remaining principal balance to be paid'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted'),
        allowNull: false,
        defaultValue: 'pending'
    },
    applicationDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    approvalDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    disbursementDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    maturityDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    purpose: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    collateral: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    guarantor: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    nextPaymentDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Next payment due date'
    },
    paymentCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of payments made so far'
    },
    latePaymentCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['loanNumber']
        },
        {
            fields: ['memberId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['applicationDate']
        }
    ]
});

module.exports = Loan;
