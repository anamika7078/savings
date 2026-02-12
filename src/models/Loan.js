const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    loanNumber: {
        type: String,
        required: true,
        unique: true
    },
    principalAmount: {
        type: Number,
        required: true
    },
    interestRate: {
        type: Number,
        required: true,
        default: 10.00
    },
    loanTerm: {
        type: Number,
        required: true // Loan term in months
    },
    monthlyPrincipalPayment: {
        type: Number,
        required: true
    },
    penaltyAmount: {
        type: Number,
        default: 0.00
    },
    totalInterestAmount: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0.00
    },
    principalPaid: {
        type: Number,
        default: 0.00
    },
    interestPaid: {
        type: Number,
        default: 0.00
    },
    remainingPrincipal: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted'],
        default: 'pending'
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    approvalDate: {
        type: Date
    },
    disbursementDate: {
        type: Date
    },
    dueDate: {
        type: Date
    },
    maturityDate: {
        type: Date
    },
    purpose: {
        type: String
    },
    collateral: {
        type: String
    },
    guarantor: {
        type: String
    },
    nextPaymentDate: {
        type: Date
    },
    paymentCount: {
        type: Number,
        default: 0
    },
    latePaymentCount: {
        type: Number,
        default: 0
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

// Virtual for repayments
loanSchema.virtual('repayments', {
    ref: 'Repayment',
    localField: '_id',
    foreignField: 'loanId'
});

loanSchema.virtual('fines', {
    ref: 'Fine',
    localField: '_id',
    foreignField: 'loanId'
});

module.exports = mongoose.model('Loan', loanSchema);
