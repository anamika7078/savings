const { Member, Loan, Savings, Repayment, Fine, User } = require('../models');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const moment = require('moment');

class ReportService {
    async getDashboardStatistics() {
        try {
            const memberStats = await this.getMemberStatistics();
            const loanStats = await this.getLoanStatistics();
            const savingsStats = await this.getSavingsStatistics();
            const fineStats = await this.getFineStatistics();

            const recentActivity = await this.getRecentActivity();

            return {
                members: memberStats,
                loans: loanStats,
                savings: savingsStats,
                fines: fineStats,
                recentActivity
            };
        } catch (error) {
            logger.error('Get dashboard statistics error:', error);
            throw error;
        }
    }

    async getMemberStatistics() {
        try {
            const total = await Member.countDocuments();
            const active = await Member.countDocuments({ status: 'active' });
            const newThisMonth = await Member.countDocuments({
                joinDate: {
                    $gte: moment().startOf('month').toDate()
                }
            });

            return { total, active, newThisMonth };
        } catch (error) {
            logger.error('Get member statistics error:', error);
            throw error;
        }
    }

    async getLoanStatistics() {
        try {
            const total = await Loan.countDocuments();
            const active = await Loan.countDocuments({ status: { $in: ['disbursed', 'active'] } });
            const pending = await Loan.countDocuments({ status: 'pending' });

            const aggregateSum = async (match, field) => {
                const res = await Loan.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: `$${field}` } } }
                ]);
                return res.length ? res[0].total : 0;
            };

            const totalDisbursed = await aggregateSum(
                { status: { $in: ['disbursed', 'active', 'completed'] } },
                'principalAmount'
            );

            const outstanding = await aggregateSum(
                { status: { $in: ['disbursed', 'active'] } },
                'remainingPrincipal'
            );

            return { total, active, pending, totalDisbursed, outstanding };
        } catch (error) {
            logger.error('Get loan statistics error:', error);
            throw error;
        }
    }

    async getSavingsStatistics() {
        try {
            const total = await Savings.countDocuments();
            const active = await Savings.countDocuments({ status: 'active' });

            const aggregateSum = async (match, field) => {
                const res = await Savings.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: `$${field}` } } }
                ]);
                return res.length ? res[0].total : 0;
            };

            const totalBalance = await aggregateSum({ status: 'active' }, 'balance');

            return { total, active, totalBalance };
        } catch (error) {
            logger.error('Get savings statistics error:', error);
            throw error;
        }
    }

    async getFineStatistics() {
        try {
            const total = await Fine.countDocuments();
            const pending = await Fine.countDocuments({ status: 'pending' });
            const paid = await Fine.countDocuments({ status: 'paid' });

            const aggregateSum = async (match, field) => {
                const res = await Fine.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: `$${field}` } } }
                ]);
                return res.length ? res[0].total : 0;
            };

            const totalAmount = await aggregateSum({}, 'amount');
            const pendingAmount = await aggregateSum({ status: 'pending' }, 'amount');

            return { total, pending, paid, totalAmount, pendingAmount };
        } catch (error) {
            logger.error('Get fine statistics error:', error);
            throw error;
        }
    }

    async getRecentActivity() {
        try {
            const recentLoans = await Loan.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate({ path: 'member', select: 'memberId firstName lastName' })
                .select('loanNumber principalAmount status createdAt');

            const recentRepayments = await Repayment.find({ status: 'paid' })
                .sort({ paymentDate: -1 })
                .limit(5)
                .populate({
                    path: 'loanId',
                    select: 'loanNumber',
                    populate: { path: 'member', select: 'memberId firstName lastName' }
                })
                .select('repaymentNumber amount paymentDate paymentMethod');

            const recentFines = await Fine.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate({ path: 'memberId', select: 'memberId firstName lastName' })
                .select('fineNumber amount type status date');

            return {
                recentLoans,
                recentRepayments,
                recentFines
            };
        } catch (error) {
            logger.error('Get recent activity error:', error);
            throw error;
        }
    }

    async getLoanPerformanceReport(startDate, endDate) {
        try {
            const loans = await Loan.find({
                applicationDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            })
                .sort({ applicationDate: -1 })
                .populate({ path: 'member', select: 'memberId firstName lastName' })
                .populate('repayments');


            const performanceData = loans.map(loan => {
                // repayments are populated. In Mongoose, this is an array of objects.
                const repayments = loan.repayments || [];
                const totalRepayments = repayments.filter(r => r.status === 'paid').length;
                const totalAmount = repayments
                    .filter(r => r.status === 'paid')
                    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

                return {
                    loanNumber: loan.loanNumber,
                    member: loan.member,
                    principalAmount: loan.principalAmount,
                    totalAmount: loan.totalAmount,
                    amountPaid: loan.amountPaid,
                    remainingAmount: loan.remainingPrincipal, // was remainingAmount in original, sticking to schema
                    status: loan.status,
                    emiPaidCount: loan.paymentCount, // was emiPaidCount, schema has paymentCount
                    totalEmiCount: loan.loanTerm,
                    performance: loan.loanTerm ? (totalRepayments / loan.loanTerm) * 100 : 0
                };
            });

            return performanceData;
        } catch (error) {
            logger.error('Get loan performance report error:', error);
            throw error;
        }
    }

    async getMemberWiseReport(memberId) {
        try {
            const member = await Member.findById(memberId)
                .populate({
                    path: 'loans',
                    populate: { path: 'repayments' }
                })
                .populate('savings');

            // Fines might not be virtual, query manually
            const fines = await Fine.find({ memberId: memberId });
            // Add fines to member object for consistency if needed, or just use `fines` array

            if (!member) {
                throw new Error('Member not found');
            }

            const loans = member.loans || [];
            const savings = member.savings || [];

            const totalLoans = loans.length;
            const activeLoans = loans.filter(loan => ['disbursed', 'active'].includes(loan.status)).length;
            const totalLoanAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.principalAmount || 0), 0);
            const totalPaid = loans.reduce((sum, loan) => sum + parseFloat(loan.amountPaid || 0), 0);
            const totalOutstanding = loans.reduce((sum, loan) => sum + parseFloat(loan.remainingPrincipal || 0), 0);

            const totalSavings = savings.reduce((sum, saving) => sum + parseFloat(saving.balance || 0), 0);
            const totalFines = fines.reduce((sum, fine) => sum + parseFloat(fine.amount || 0), 0);
            const paidFines = fines.filter(fine => fine.status === 'paid').reduce((sum, fine) => sum + parseFloat(fine.amount || 0), 0);

            return {
                member,
                loanSummary: {
                    totalLoans,
                    activeLoans,
                    totalLoanAmount,
                    totalPaid,
                    totalOutstanding
                },
                savingsSummary: {
                    totalSavings,
                    accountCount: savings.length
                },
                fineSummary: {
                    totalFines,
                    paidFines,
                    pendingFines: totalFines - paidFines
                }
            };
        } catch (error) {
            logger.error('Get member wise report error:', error);
            throw error;
        }
    }

    async getFinancialSummary(startDate, endDate) {
        try {
            const incomeSources = await this.getIncomeSources(startDate, endDate);
            const expenseAnalysis = await this.getExpenseAnalysis(startDate, endDate);
            const cashFlow = await this.getCashFlowAnalysis(startDate, endDate); // passing dates is redundant if we call internal methods with dates? No, we need dates.

            return {
                incomeSources,
                expenseAnalysis,
                cashFlow,
                period: { startDate, endDate }
            };
        } catch (error) {
            logger.error('Get financial summary error:', error);
            throw error;
        }
    }

    async getIncomeSources(startDate, endDate) {
        try {
            const match = {
                status: 'paid',
                paymentDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            const aggregateSumRepayment = async (field) => {
                const res = await Repayment.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: `$${field}` } } }
                ]);
                return res.length ? res[0].total : 0;
            };

            const loanRepayments = await aggregateSumRepayment('amount');
            const lateFees = await aggregateSumRepayment('lateFee');

            const finePaymentsRes = await Fine.aggregate([
                {
                    $match: {
                        status: 'paid',
                        paymentDate: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const finePayments = finePaymentsRes.length ? finePaymentsRes[0].total : 0;

            return {
                loanRepayments,
                finePayments,
                lateFees,
                totalIncome: loanRepayments + finePayments + lateFees
            };
        } catch (error) {
            logger.error('Get income sources error:', error);
            throw error;
        }
    }

    async getExpenseAnalysis(startDate, endDate) {
        try {
            const res = await Loan.aggregate([
                {
                    $match: {
                        disbursementDate: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$principalAmount' } } }
            ]);

            const loanDisbursements = res.length ? res[0].total : 0;

            return {
                loanDisbursements,
                totalExpenses: loanDisbursements
            };
        } catch (error) {
            logger.error('Get expense analysis error:', error);
            throw error;
        }
    }

    async getCashFlowAnalysis(startDate, endDate) {
        try {
            const income = await this.getIncomeSources(startDate, endDate);
            const expenses = await this.getExpenseAnalysis(startDate, endDate);

            const netCashFlow = income.totalIncome - expenses.totalExpenses;

            return {
                totalIncome: income.totalIncome,
                totalExpenses: expenses.totalExpenses,
                netCashFlow,
                cashFlowStatus: netCashFlow >= 0 ? 'Positive' : 'Negative'
            };
        } catch (error) {
            logger.error('Get cash flow analysis error:', error);
            throw error;
        }
    }
}

module.exports = new ReportService();
