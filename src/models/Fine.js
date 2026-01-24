const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Fine = sequelize.define('Fine', {
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
    loanId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Loans',
            key: 'id'
        }
    },
    fineNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    type: {
        type: DataTypes.ENUM('late_payment', 'missed_meeting', 'violation', 'other'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'waived', 'disputed'),
        allowNull: false,
        defaultValue: 'pending'
    },
    paymentDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'bank_transfer', 'check', 'online'),
        allowNull: true
    },
    waivedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    waiveReason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['fineNumber']
        },
        {
            fields: ['memberId']
        },
        {
            fields: ['loanId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['type']
        },
        {
            fields: ['date']
        }
    ]
});

module.exports = Fine;
