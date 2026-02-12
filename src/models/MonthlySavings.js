const mongoose = require('mongoose');

const monthlySavingsSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    savingMonth: {
        type: String, // '01', '02', etc.
        required: true
    },
    savingYear: {
        type: String, // '2024', '2025', etc.
        required: true
    },
    monthlyFixedAmount: {
        type: Number,
        required: true
    },
    fine: {
        type: Number,
        default: 0.00
    },
    carryForwardAmount: {
        type: Number,
        default: 0.00
    },
    totalPayableAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid'],
        default: 'unpaid'
    },
    paymentDate: {
        type: Date
    },
    remarks: {
        type: String
    },
    entryDate: {
        type: Date,
        default: Date.now
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

// Ensure uniqueness of month+year per member
monthlySavingsSchema.index({ memberId: 1, savingMonth: 1, savingYear: 1 }, { unique: true });

module.exports = mongoose.model('MonthlySavings', monthlySavingsSchema);
