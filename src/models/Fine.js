const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan'
    },
    fineNumber: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['late_payment', 'missed_meeting', 'violation', 'other'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'waived', 'disputed'],
        default: 'pending'
    },
    paymentDate: {
        type: Date
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'check', 'online']
    },
    waivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    waiveReason: {
        type: String
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

module.exports = mongoose.model('Fine', fineSchema);
