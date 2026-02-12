const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema({
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true
    },
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    repaymentNumber: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    principalAmount: {
        type: Number,
        required: true
    },
    interestAmount: {
        type: Number,
        required: true
    },
    penaltyAmount: {
        type: Number,
        required: true,
        default: 0.00
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'partial', 'overdue'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'check', 'online']
    },
    transactionId: {
        type: String
    },
    lateFee: {
        type: Number,
        default: 0.00
    },
    remarks: {
        type: String
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

module.exports = mongoose.model('Repayment', repaymentSchema);
