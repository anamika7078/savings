const { Member, Loan, Savings, Repayment, Fine, User } = require('../models');
const { sequelize } = require('../models');
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
            const total = await Member.count();
            const active = await Member.count({ where: { status: 'active' } });
            const newThisMonth = await Member.count({
                where: {
                    joinDate: {
                        [sequelize.Sequelize.Op.gte]: moment().startOf('month').toDate()
                    }
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
            const total = await Loan.count();
            const active = await Loan.count({ where: { status: ['disbursed', 'active'] } });
            const pending = await Loan.count({ where: { status: 'pending' } });

            const totalDisbursed = await Loan.sum('principalAmount', {
                where: { status: ['disbursed', 'active', 'completed'] }
            }) || 0;

            const outstanding = await Loan.sum('remainingAmount', {
                where: { status: ['disbursed', 'active'] }
            }) || 0;

            return { total, active, pending, totalDisbursed, outstanding };
        } catch (error) {
            logger.error('Get loan statistics error:', error);
            throw error;
        }
    }

    async getSavingsStatistics() {
        try {
            const total = await Savings.count();
            const active = await Savings.count({ where: { status: 'active' } });

            const totalBalance = await Savings.sum('balance', {
                where: { status: 'active' }
            }) || 0;

            return { total, active, totalBalance };
        } catch (error) {
            logger.error('Get savings statistics error:', error);
            throw error;
        }
    }

    async getFineStatistics() {
        try {
            const total = await Fine.count();
            const pending = await Fine.count({ where: { status: 'pending' } });
            const paid = await Fine.count({ where: { status: 'paid' } });

            const totalAmount = await Fine.sum('amount') || 0;
            const pendingAmount = await Fine.sum('amount', {
                where: { status: 'pending' }
            }) || 0;

            return { total, pending, paid, totalAmount, pendingAmount };
        } catch (error) {
            logger.error('Get fine statistics error:', error);
            throw error;
        }
    }

    async getRecentActivity() {
        try {
            const recentLoans = await Loan.findAll({
                limit: 5,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['memberId', 'firstName', 'lastName']
                    }
                ],
                attributes: ['loanNumber', 'principalAmount', 'status', 'createdAt']
            });

            const recentRepayments = await Repayment.findAll({
                limit: 5,
                where: { status: 'paid' },
                order: [['paymentDate', 'DESC']],
                include: [
                    {
                        model: Loan,
                        as: 'loan',
                        attributes: ['loanNumber'],
                        include: [
                            {
                                model: Member,
                                as: 'member',
                                attributes: ['memberId', 'firstName', 'lastName']
                            }
                        ]
                    }
                ],
                attributes: ['repaymentNumber', 'amount', 'paymentDate', 'paymentMethod']
            });

            const recentFines = await Fine.findAll({
                limit: 5,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['memberId', 'firstName', 'lastName']
                    }
                ],
                attributes: ['fineNumber', 'amount', 'type', 'status', 'date']
            });

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
            const loans = await Loan.findAll({
                where: {
                    applicationDate: {
                        [sequelize.Sequelize.Op.between]: [startDate, endDate]
                    }
                },
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['memberId', 'firstName', 'lastName']
                    },
                    {
                        model: Repayment,
                        as: 'repayments'
                    }
                ],
                order: [['applicationDate', 'DESC']]
            });

            const performanceData = loans.map(loan => {
                const totalRepayments = loan.repayments.filter(r => r.status === 'paid').length;
                const totalAmount = loan.repayments
                    .filter(r => r.status === 'paid')
                    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

                return {
                    loanNumber: loan.loanNumber,
                    member: loan.member,
                    principalAmount: loan.principalAmount,
                    totalAmount: loan.totalAmount,
                    amountPaid: loan.amountPaid,
                    remainingAmount: loan.remainingAmount,
                    status: loan.status,
                    emiPaidCount: loan.emiPaidCount,
                    totalEmiCount: loan.loanTerm,
                    performance: (totalRepayments / loan.loanTerm) * 100
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
            const member = await Member.findByPk(memberId, {
                include: [
                    {
                        model: Loan,
                        as: 'loans',
                        include: [
                            {
                                model: Repayment,
                                as: 'repayments'
                            }
                        ]
                    },
                    {
                        model: Savings,
                        as: 'savings'
                    },
                    {
                        model: Fine,
                        as: 'fines'
                    }
                ]
            });

            if (!member) {
                throw new Error('Member not found');
            }

            const totalLoans = member.loans.length;
            const activeLoans = member.loans.filter(loan => ['disbursed', 'active'].includes(loan.status)).length;
            const totalLoanAmount = member.loans.reduce((sum, loan) => sum + parseFloat(loan.principalAmount), 0);
            const totalPaid = member.loans.reduce((sum, loan) => sum + parseFloat(loan.amountPaid), 0);
            const totalOutstanding = member.loans.reduce((sum, loan) => sum + parseFloat(loan.remainingAmount), 0);

            const totalSavings = member.savings.reduce((sum, saving) => sum + parseFloat(saving.balance), 0);
            const totalFines = member.fines.reduce((sum, fine) => sum + parseFloat(fine.amount), 0);
            const paidFines = member.fines.filter(fine => fine.status === 'paid').reduce((sum, fine) => sum + parseFloat(fine.amount), 0);

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
                    accountCount: member.savings.length
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
            const cashFlow = await this.getCashFlowAnalysis(startDate, endDate);

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
            const loanRepayments = await Repayment.sum('amount', {
                where: {
                    status: 'paid',
                    paymentDate: {
                        [sequelize.Sequelize.Op.between]: [startDate, endDate]
                    }
                }
            }) || 0;

            const finePayments = await Fine.sum('amount', {
                where: {
                    status: 'paid',
                    paymentDate: {
                        [sequelize.Sequelize.Op.between]: [startDate, endDate]
                    }
                }
            }) || 0;

            const lateFees = await Repayment.sum('lateFee', {
                where: {
                    status: 'paid',
                    paymentDate: {
                        [sequelize.Sequelize.Op.between]: [startDate, endDate]
                    }
                }
            }) || 0;

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
            const loanDisbursements = await Loan.sum('principalAmount', {
                where: {
                    disbursementDate: {
                        [sequelize.Sequelize.Op.between]: [startDate, endDate]
                    }
                }
            }) || 0;

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
