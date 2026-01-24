const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FinanceRule = sequelize.define('FinanceRule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    category: {
        type: DataTypes.ENUM('loan', 'savings', 'fine', 'general'),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('percentage', 'fixed', 'formula'),
        allowNull: false
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    effectiveDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    minAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    maxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    conditions: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string for complex conditions'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['name']
        },
        {
            fields: ['category']
        },
        {
            fields: ['isActive']
        },
        {
            fields: ['effectiveDate']
        }
    ]
});

module.exports = FinanceRule;
