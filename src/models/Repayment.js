const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Repayment = sequelize.define('Repayment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    loanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Loans',
            key: 'id'
        }
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Members',
            key: 'id'
        }
    },
    repaymentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    principalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    interestAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    penaltyAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Monthly penalty amount applied to this repayment'
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'partial', 'overdue'),
        allowNull: false,
        defaultValue: 'pending'
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'bank_transfer', 'check', 'online'),
        allowNull: true
    },
    transactionId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    lateFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['loanId']
        },
        {
            fields: ['memberId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['dueDate']
        },
        {
            fields: ['paymentDate']
        }
    ]
});

module.exports = Repayment;
