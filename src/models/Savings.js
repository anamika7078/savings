const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Savings = sequelize.define('Savings', {
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
    accountNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    balance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    interestRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 5.00
    },
    lastInterestCalculated: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'frozen'),
        allowNull: false,
        defaultValue: 'active'
    },
    minimumBalance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    accountType: {
        type: DataTypes.ENUM('regular', 'fixed', 'recurring'),
        allowNull: false,
        defaultValue: 'regular'
    },
    maturityDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    monthlyContribution: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['accountNumber']
        },
        {
            fields: ['memberId']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = Savings;
