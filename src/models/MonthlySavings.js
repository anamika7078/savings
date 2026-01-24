const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MonthlySavings = sequelize.define('MonthlySavings', {
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
    savingMonth: {
        type: DataTypes.STRING(2), // '01', '02', etc.
        allowNull: false
    },
    savingYear: {
        type: DataTypes.STRING(4), // '2024', '2025', etc.
        allowNull: false
    },
    monthlyFixedAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    fine: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    carryForwardAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    totalPayableAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    paymentStatus: {
        type: DataTypes.ENUM('paid', 'unpaid'),
        allowNull: false,
        defaultValue: 'unpaid'
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    entryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['memberId', 'savingMonth', 'savingYear']
        },
        {
            fields: ['memberId']
        },
        {
            fields: ['paymentStatus']
        },
        {
            fields: ['savingMonth', 'savingYear']
        }
    ],
    tableName: 'MonthlySavings'
});

module.exports = MonthlySavings;
