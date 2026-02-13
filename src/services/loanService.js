const { Loan, Member, Repayment, Fine } = require('../models');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const moment = require('moment');

class LoanService {
    calculateLoanTerm(principalAmount, monthlyPrincipalPayment) {
        return Math.ceil(principalAmount / monthlyPrincipalPayment);
    }

    calculatePaymentSchedule(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount = 0) {
        const schedule = [];
        let remainingBalance = principalAmount;
        let month = 1;

        while (remainingBalance > 0 && month <= 360) { // Max 30 years
            const interestPayment = remainingBalance * monthlyInterestRate / 100;
            const principalPayment = Math.min(monthlyPrincipalPayment, remainingBalance);
            const totalPayment = principalPayment + interestPayment + penaltyAmount;

            schedule.push({
                month,
                openingBalance: remainingBalance,
                principalPayment,
                interestPayment,
                penaltyAmount,
                totalPayment,
                closingBalance: remainingBalance - principalPayment
            });

            remainingBalance -= principalPayment;
            month++;
        }

        return schedule;
    }

    calculateTotalInterest(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount = 0) {
        const schedule = this.calculatePaymentSchedule(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount);
        return schedule.reduce((total, payment) => total + payment.interestPayment, 0);
    }

    calculateTotalAmount(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount = 0) {
        const totalInterest = this.calculateTotalInterest(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount);
        const totalPenalty = this.calculateTotalPenalty(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount);
        return principalAmount + totalInterest + totalPenalty;
    }

    calculateTotalPenalty(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount = 0) {
        const schedule = this.calculatePaymentSchedule(principalAmount, monthlyInterestRate, monthlyPrincipalPayment, penaltyAmount);
        return schedule.reduce((total, payment) => total + (payment.penaltyAmount || 0), 0);
    }

    async createLoanApplication(loanData) {
        // Omitting transaction for simplicity in migration unless replica set is active
        try {
            const lastLoan = await Loan.findOne().sort({ createdAt: -1 });

            let nextLoanNumber = 'LOAN0001';
            if (lastLoan && lastLoan.loanNumber) {
                const numStr = lastLoan.loanNumber.replace('LOAN', '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num)) {
                    nextLoanNumber = `LOAN${String(num + 1).padStart(4, '0')}`;
                }
            }

            const loanTerm = this.calculateLoanTerm(parseFloat(loanData.principalAmount), parseFloat(loanData.monthlyPrincipalPayment));
            const totalInterestAmount = this.calculateTotalInterest(parseFloat(loanData.principalAmount), parseFloat(loanData.interestRate), parseFloat(loanData.monthlyPrincipalPayment), parseFloat(loanData.penaltyAmount));
            const totalAmount = this.calculateTotalAmount(parseFloat(loanData.principalAmount), parseFloat(loanData.interestRate), parseFloat(loanData.monthlyPrincipalPayment), parseFloat(loanData.penaltyAmount));

            const loan = await Loan.create({
                ...loanData,
                loanNumber: nextLoanNumber,
                loanTerm,
                totalInterestAmount,
                totalAmount,
                remainingPrincipal: parseFloat(loanData.principalAmount),
                applicationDate: new Date()
            });

            const paymentSchedule = this.calculatePaymentSchedule(
                parseFloat(loanData.principalAmount),
                parseFloat(loanData.interestRate),
                parseFloat(loanData.monthlyPrincipalPayment),
                parseFloat(loanData.penaltyAmount || 0)
            );

            const repayments = paymentSchedule.map((payment, index) => ({
                loanId: loan._id,
                memberId: loanData.memberId,
                repaymentNumber: index + 1,
                amount: payment.totalPayment,
                principalAmount: payment.principalPayment,
                interestAmount: payment.interestPayment,
                penaltyAmount: payment.penaltyAmount || 0,
                dueDate: moment().add(index + 1, 'months').toDate(),
                status: 'pending'
            }));

            await Repayment.insertMany(repayments);

            await Loan.findByIdAndUpdate(loan._id, {
                nextPaymentDate: moment().add(1, 'months').toDate(),
                dueDate: moment().add(1, 'months').toDate(),
                maturityDate: moment().add(loanTerm, 'months').toDate()
            });

            logger.info(`New loan application created: ${loan.loanNumber}`);

            return loan;
        } catch (error) {
            logger.error('Create loan application error:', error);
            throw error;
        }
    }

    async getAllLoans(page = 1, limit = 10, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            const query = {};

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.memberId) {
                query.memberId = filters.memberId;
            }

            const loans = await Loan.find(query)
                .populate({ path: 'memberId', select: 'memberId firstName lastName phone' })
                .populate({ path: 'repayments', select: 'repaymentNumber amount dueDate status paymentDate' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Loan.countDocuments(query);

            return {
                loans,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Get all loans error:', error);
            throw error;
        }
    }

    async getLoanById(id) {
        try {
            const loan = await Loan.findById(id)
                .populate('memberId')
                .populate('repayments')
                // .populate('fines') // Assuming virtual or we fetch separately
                ;

            if (!loan) {
                throw new Error('Loan not found');
            }

            return loan;
        } catch (error) {
            logger.error('Get loan by ID error:', error);
            throw error;
        }
    }

    async approveLoan(id) {
        try {
            const loan = await Loan.findById(id);

            if (!loan) {
                throw new Error('Loan not found');
            }

            if (loan.status !== 'pending') {
                throw new Error('Loan can only be approved from pending status');
            }

            loan.status = 'approved';
            loan.approvalDate = new Date();
            await loan.save();

            logger.info(`Loan approved: ${loan.loanNumber}`);

            return loan;
        } catch (error) {
            logger.error('Approve loan error:', error);
            throw error;
        }
    }

    async disburseLoan(id, disbursementDate = new Date()) {
        try {
            const loan = await Loan.findById(id);

            if (!loan) {
                throw new Error('Loan not found');
            }

            if (loan.status !== 'approved') {
                throw new Error('Loan can only be disbursed from approved status');
            }

            loan.status = 'disbursed';
            loan.disbursementDate = disbursementDate;
            loan.nextPaymentDate = moment(disbursementDate).add(1, 'months').toDate();
            await loan.save();

            logger.info(`Loan disbursed: ${loan.loanNumber}`);

            return loan;
        } catch (error) {
            logger.error('Disburse loan error:', error);
            throw error;
        }
    }

    async makeRepayment(repaymentId, paymentMethod, transactionId) {
        try {
            const repayment = await Repayment.findById(repaymentId).populate('loanId'); // Populate loanId to get Loan doc
            // Note: In Mongoose repayment.loanId is the Loan document if populated.
            // Let's assume we used 'ref: Loan' in Repayment model.

            if (!repayment) {
                throw new Error('Repayment not found');
            }

            // Allow for manual population if needed
            let loan = repayment.loanId;
            if (!loan._id && mongoose.isValidObjectId(repayment.loanId)) {
                loan = await Loan.findById(repayment.loanId);
            }
            if (!loan) {
                throw new Error('Associated loan not found');
            }

            if (repayment.status === 'paid') {
                throw new Error('Repayment already paid');
            }

            const today = moment();
            const dueDate = moment(repayment.dueDate);
            const daysLate = today.diff(dueDate, 'days');

            let lateFee = 0;
            if (daysLate > 0) {
                lateFee = Math.round(repayment.amount * 0.02 * Math.min(daysLate, 30));
            }

            repayment.status = 'paid';
            repayment.paymentDate = today.toDate();
            repayment.paymentMethod = paymentMethod;
            repayment.transactionId = transactionId;
            repayment.lateFee = lateFee;
            await repayment.save();

            const newAmountPaid = (loan.amountPaid || 0) + repayment.amount + lateFee;
            const newPrincipalPaid = (loan.principalPaid || 0) + repayment.principalAmount;
            const newInterestPaid = (loan.interestPaid || 0) + repayment.interestAmount + (repayment.penaltyAmount || 0) + lateFee;
            const newRemainingPrincipal = (loan.remainingPrincipal || 0) - repayment.principalAmount;

            loan.amountPaid = newAmountPaid;
            loan.principalPaid = newPrincipalPaid;
            loan.interestPaid = newInterestPaid;
            loan.remainingPrincipal = newRemainingPrincipal;
            loan.paymentCount = (loan.paymentCount || 0) + 1;
            if (daysLate > 0) {
                loan.latePaymentCount = (loan.latePaymentCount || 0) + 1;
            }

            if (newRemainingPrincipal <= 0) {
                loan.status = 'completed';
            } else {
                const nextRepayment = await Repayment.findOne({
                    loanId: loan._id,
                    status: 'pending'
                }).sort({ repaymentNumber: 1 });

                if (nextRepayment) {
                    loan.nextPaymentDate = nextRepayment.dueDate;
                }
            }
            await loan.save();

            logger.info(`Repayment made for loan ${loan.loanNumber}: ${repayment.amount}`);

            return {
                repayment,
                loan,
                lateFee
            };
        } catch (error) {
            logger.error('Make repayment error:', error);
            throw error;
        }
    }

    async getLoanStatistics() {
        try {
            const totalLoans = await Loan.countDocuments();
            const pendingLoans = await Loan.countDocuments({ status: 'pending' });
            const approvedLoans = await Loan.countDocuments({ status: 'approved' });
            const disbursedLoans = await Loan.countDocuments({ status: 'disbursed' });
            const activeLoans = await Loan.countDocuments({ status: 'active' });
            const completedLoans = await Loan.countDocuments({ status: 'completed' });
            const defaultedLoans = await Loan.countDocuments({ status: 'defaulted' });

            const aggregateSum = async (statusList, field) => {
                const result = await Loan.aggregate([
                    { $match: { status: { $in: statusList } } },
                    { $group: { _id: null, total: { $sum: `$${field}` } } }
                ]);
                return result.length > 0 ? result[0].total : 0;
            };

            const totalDisbursed = await aggregateSum(['disbursed', 'active', 'completed'], 'principalAmount');
            const totalRecovered = await aggregateSum(['disbursed', 'active', 'completed'], 'amountPaid');
            const outstandingAmount = await aggregateSum(['disbursed', 'active'], 'remainingPrincipal');

            return {
                totalLoans,
                pendingLoans,
                approvedLoans,
                disbursedLoans,
                activeLoans,
                completedLoans,
                defaultedLoans,
                totalDisbursed: totalDisbursed || 0,
                totalRecovered: totalRecovered || 0,
                outstandingAmount: outstandingAmount || 0
            };
        } catch (error) {
            logger.error('Get loan statistics error:', error);
            throw error;
        }
    }
}

module.exports = new LoanService();
