const mongoose = require('mongoose');

const savingsSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    accountNumber: {
        type: String,
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0.00
    },
    interestRate: {
        type: Number,
        required: true,
        default: 5.00
    },
    lastInterestCalculated: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'frozen'],
        default: 'active'
    },
    minimumBalance: {
        type: Number,
        required: true,
        default: 0.00
    },
    accountType: {
        type: String,
        enum: ['regular', 'fixed', 'recurring'],
        default: 'regular'
    },
    maturityDate: {
        type: Date
    },
    monthlyContribution: {
        type: Number
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Savings', savingsSchema);
