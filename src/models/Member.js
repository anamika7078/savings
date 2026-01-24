const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Member = sequelize.define('Member', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    firstName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            len: [2, 50],
            notEmpty: true
        }
    },
    lastName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            len: [2, 50],
            notEmpty: true
        }
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    joinDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active'
    },
    occupation: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    monthlyIncome: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    idNumber: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    emergencyContact: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    emergencyPhone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    memberName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    monthlySavingAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    workingLoanFund: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    workingSavingsFund: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    penaltyAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    totalSavings: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    outstandingLoanBalance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['memberId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['joinDate']
        }
    ]
});

module.exports = Member;
