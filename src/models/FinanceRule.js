const mongoose = require('mongoose');

const financeRuleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['loan', 'savings', 'fine', 'general'],
        required: true
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed', 'formula'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date
    },
    minAmount: {
        type: Number
    },
    maxAmount: {
        type: Number
    },
    conditions: {
        type: String // JSON string
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

module.exports = mongoose.model('FinanceRule', financeRuleSchema);
