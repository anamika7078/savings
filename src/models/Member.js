const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    memberId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        trim: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    occupation: {
        type: String
    },
    monthlyIncome: {
        type: Number
    },
    idNumber: {
        type: String
    },
    emergencyContact: {
        type: String
    },
    emergencyPhone: {
        type: String
    },
    memberName: {
        type: String
    },
    monthlySavingAmount: {
        type: Number,
        default: 0
    },
    workingLoanFund: {
        type: Number,
        default: 0
    },
    workingSavingsFund: {
        type: Number,
        default: 0
    },
    penaltyAmount: {
        type: Number,
        default: 0
    },
    totalSavings: {
        type: Number,
        default: 0
    },
    outstandingLoanBalance: {
        type: Number,
        default: 0
    },
    createdBy: {
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

// Virtuals for relationships (if needed) like loans, savings etc.
memberSchema.virtual('savings', {
    ref: 'Savings',
    localField: '_id',
    foreignField: 'memberId'
});

memberSchema.virtual('loans', {
    ref: 'Loan',
    localField: '_id',
    foreignField: 'memberId'
});

module.exports = mongoose.model('Member', memberSchema);
