const { Repayment, Loan, Member } = require('../models');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const moment = require('moment');

class RepaymentService {
    async getAllRepayments(page = 1, limit = 10, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            const query = {};

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.memberId) {
                query.memberId = filters.memberId;
            }

            if (filters.loanId) {
                query.loanId = filters.loanId;
            }

            if (filters.startDate && filters.endDate) {
                query.dueDate = {
                    $gte: new Date(filters.startDate),
                    $lte: new Date(filters.endDate)
                };
            }

            const repayments = await Repayment.find(query)
                .populate({
                    path: 'loanId',
                    populate: { path: 'member', select: 'memberId firstName lastName' }
                })
                .populate({ path: 'memberId', select: 'memberId firstName lastName' })
                .sort({ dueDate: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Repayment.countDocuments(query);

            return {
                repayments,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Get all repayments error:', error);
            throw error;
        }
    }

    async getRepaymentById(id) {
        try {
            const repayment = await Repayment.findById(id)
                .populate({
                    path: 'loanId',
                    populate: { path: 'member', select: 'memberId firstName lastName' }
                })
                .populate({ path: 'memberId', select: 'memberId firstName lastName' });

            if (!repayment) {
                throw new Error('Repayment not found');
            }

            return repayment;
        } catch (error) {
            logger.error('Get repayment by ID error:', error);
            throw error;
        }
    }

    async makeRepayment(id, paymentData) {
        try {
            const repayment = await Repayment.findById(id).populate('loanId');

            if (!repayment) {
                throw new Error('Repayment not found');
            }

            if (repayment.status === 'paid') {
                throw new Error('Repayment is already paid');
            }

            repayment.status = 'paid';
            repayment.paymentDate = new Date();
            repayment.paymentMethod = paymentData.paymentMethod;
            repayment.transactionId = paymentData.transactionId;
            repayment.remarks = paymentData.remarks;
            await repayment.save();

            let loan = repayment.loanId;
            if (!loan && repayment.loanId) {
                // loanId is populated but if it was just an ID string (unlikely given populate)
                // Just in case populate failed or model definition issue
                if (mongoose.isValidObjectId(repayment.loanId)) {
                    loan = await Loan.findById(repayment.loanId);
                }
            }

            if (loan) {
                // Assuming 'remainingPrincipal' field from LoanService rewrite
                const newRemainingPrincipal = (loan.remainingPrincipal || 0) - repayment.principalAmount;
                loan.remainingPrincipal = newRemainingPrincipal;
                if (newRemainingPrincipal <= 0) {
                    loan.status = 'completed';
                }
                await loan.save();
            }

            logger.info(`Repayment made: ${id} for loan: ${loan?._id}`);

            return await this.getRepaymentById(id);
        } catch (error) {
            logger.error('Make repayment error:', error);
            throw error;
        }
    }

    async getOverdueRepayments() {
        try {
            const startOfDay = moment().startOf('day').toDate();

            const overdueRepayments = await Repayment.find({
                status: 'pending',
                dueDate: { $lt: startOfDay }
            })
                .populate({
                    path: 'loanId',
                    populate: { path: 'member', select: 'memberId firstName lastName' }
                })
                .populate({ path: 'memberId', select: 'memberId firstName lastName' })
                .sort({ dueDate: 1 });

            return overdueRepayments;
        } catch (error) {
            logger.error('Get overdue repayments error:', error);
            throw error;
        }
    }

    async getRepaymentStatistics() {
        try {
            const total = await Repayment.countDocuments();
            const paid = await Repayment.countDocuments({ status: 'paid' });
            const pending = await Repayment.countDocuments({ status: 'pending' });
            const overdue = await Repayment.countDocuments({
                status: 'pending',
                dueDate: { $lt: moment().startOf('day').toDate() }
            });

            const aggregateSum = async (match, field) => {
                const res = await Repayment.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: `$${field}` } } }
                ]);
                return res.length ? res[0].total : 0;
            };

            const totalAmount = await aggregateSum({}, 'amount');
            const paidAmount = await aggregateSum({ status: 'paid' }, 'amount');
            const pendingAmount = await aggregateSum({ status: 'pending' }, 'amount');

            const startOfMonth = moment().startOf('month').toDate();
            const thisMonthStats = await Repayment.aggregate([
                {
                    $match: {
                        paymentDate: { $gte: startOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            return {
                total,
                paid,
                pending,
                overdue,
                totalAmount,
                paidAmount,
                pendingAmount,
                thisMonth: {
                    count: thisMonthStats.length ? thisMonthStats[0].count : 0,
                    total: thisMonthStats.length ? thisMonthStats[0].total : 0
                }
            };
        } catch (error) {
            logger.error('Get repayment statistics error:', error);
            throw error;
        }
    }

    async generateRepaymentSchedule(loanId) {
        try {
            const loan = await Loan.findById(loanId);

            if (!loan) {
                throw new Error('Loan not found');
            }

            const emi = parseFloat(loan.monthlyPrincipalPayment || 0);
            const principalAmount = parseFloat(loan.principalAmount);
            const tenure = parseInt(loan.loanTerm);
            const interestRate = parseFloat(loan.interestRate);
            const startDate = moment(loan.disbursementDate || moment());

            const repayments = [];
            let remainingPrincipal = principalAmount;
            const monthlyInterestRate = interestRate / 12 / 100;

            for (let i = 1; i <= tenure; i++) {
                const interestAmount = remainingPrincipal * monthlyInterestRate;
                const principalComponent = emi - interestAmount; // assuming emi is total payment

                const dueDate = moment(startDate).add(i, 'months');

                repayments.push({
                    repaymentNumber: i,
                    amount: emi,
                    principalAmount: principalComponent,
                    interestAmount: interestAmount,
                    dueDate: dueDate.format('YYYY-MM-DD'),
                    status: moment().isAfter(dueDate) ? 'overdue' : 'pending'
                });

                remainingPrincipal -= principalComponent;
            }

            return repayments;
        } catch (error) {
            logger.error('Generate repayment schedule error:', error);
            throw error;
        }
    }

    async updateRepayment(id, updateData) {
        try {
            const repayment = await Repayment.findByIdAndUpdate(id, updateData, { new: true });

            if (!repayment) {
                throw new Error('Repayment not found');
            }

            logger.info(`Repayment updated: ${id}`);

            return repayment;
        } catch (error) {
            logger.error('Update repayment error:', error);
            throw error;
        }
    }
}

module.exports = new RepaymentService();
