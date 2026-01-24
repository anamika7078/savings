const { Loan, Member, Repayment, Fine } = require('../models');
const { sequelize } = require('../models');
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
        const transaction = await sequelize.transaction();

        try {
            const lastLoan = await Loan.findOne({
                order: [['id', 'DESC']],
                transaction
            });

            const loanNumber = lastLoan ? `LOAN${String(lastLoan.id + 1).padStart(4, '0')}` : 'LOAN0001';

            const loanTerm = this.calculateLoanTerm(loanData.principalAmount, loanData.monthlyPrincipalPayment);
            const totalInterestAmount = this.calculateTotalInterest(loanData.principalAmount, loanData.interestRate, loanData.monthlyPrincipalPayment, loanData.penaltyAmount);
            const totalAmount = this.calculateTotalAmount(loanData.principalAmount, loanData.interestRate, loanData.monthlyPrincipalPayment, loanData.penaltyAmount);

            const loan = await Loan.create({
                ...loanData,
                loanNumber,
                loanTerm,
                totalInterestAmount,
                totalAmount,
                remainingPrincipal: loanData.principalAmount,
                applicationDate: new Date()
            }, { transaction });

            const paymentSchedule = this.calculatePaymentSchedule(
                parseFloat(loanData.principalAmount),
                parseFloat(loanData.interestRate),
                parseFloat(loanData.monthlyPrincipalPayment),
                parseFloat(loanData.penaltyAmount || 0)
            );

            const repayments = paymentSchedule.map((payment, index) => ({
                loanId: loan.id,
                memberId: loanData.memberId,
                repaymentNumber: index + 1,
                amount: payment.totalPayment,
                principalAmount: payment.principalPayment,
                interestAmount: payment.interestPayment,
                penaltyAmount: payment.penaltyAmount || 0,
                dueDate: moment().add(index + 1, 'months').format('YYYY-MM-DD'),
                status: 'pending'
            }));

            await Repayment.bulkCreate(repayments, { transaction });

            await loan.update({
                nextPaymentDate: moment().add(1, 'months').toDate(),
                dueDate: moment().add(1, 'months').toDate(),
                maturityDate: moment().add(loanTerm, 'months').toDate()
            }, { transaction });

            await transaction.commit();

            logger.info(`New loan application created: ${loan.loanNumber}`);

            return loan;
        } catch (error) {
            await transaction.rollback();
            logger.error('Create loan application error:', error);
            throw error;
        }
    }

    async getAllLoans(page = 1, limit = 10, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            const where = {};

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.memberId) {
                where.memberId = filters.memberId;
            }

            const { count, rows } = await Loan.findAndCountAll({
                where,
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['memberId', 'firstName', 'lastName', 'phone']
                    },
                    {
                        model: Repayment,
                        as: 'repayments',
                        attributes: ['repaymentNumber', 'amount', 'dueDate', 'status', 'paymentDate']
                    }
                ],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            return {
                loans: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            logger.error('Get all loans error:', error);
            throw error;
        }
    }

    async getLoanById(id) {
        try {
            const loan = await Loan.findByPk(id, {
                include: [
                    {
                        model: Member,
                        as: 'member'
                    },
                    {
                        model: Repayment,
                        as: 'repayments'
                    },
                    {
                        model: Fine,
                        as: 'fines'
                    }
                ]
            });

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
        const transaction = await sequelize.transaction();

        try {
            const loan = await Loan.findByPk(id, { transaction });

            if (!loan) {
                throw new Error('Loan not found');
            }

            if (loan.status !== 'pending') {
                throw new Error('Loan can only be approved from pending status');
            }

            await loan.update({
                status: 'approved',
                approvalDate: new Date()
            }, { transaction });

            await transaction.commit();

            logger.info(`Loan approved: ${loan.loanNumber}`);

            return loan;
        } catch (error) {
            await transaction.rollback();
            logger.error('Approve loan error:', error);
            throw error;
        }
    }

    async disburseLoan(id, disbursementDate = new Date()) {
        const transaction = await sequelize.transaction();

        try {
            const loan = await Loan.findByPk(id, { transaction });

            if (!loan) {
                throw new Error('Loan not found');
            }

            if (loan.status !== 'approved') {
                throw new Error('Loan can only be disbursed from approved status');
            }

            await loan.update({
                status: 'disbursed',
                disbursementDate,
                nextPaymentDate: moment(disbursementDate).add(1, 'months').toDate()
            }, { transaction });

            await transaction.commit();

            logger.info(`Loan disbursed: ${loan.loanNumber}`);

            return loan;
        } catch (error) {
            await transaction.rollback();
            logger.error('Disburse loan error:', error);
            throw error;
        }
    }

    async makeRepayment(repaymentId, paymentMethod, transactionId) {
        const transaction = await sequelize.transaction();

        try {
            const repayment = await Repayment.findByPk(repaymentId, {
                include: [{ model: Loan, as: 'loan' }],
                transaction
            });

            if (!repayment) {
                throw new Error('Repayment not found');
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

            await repayment.update({
                status: 'paid',
                paymentDate: today.toDate(),
                paymentMethod,
                transactionId,
                lateFee
            }, { transaction });

            const loan = repayment.loan;
            const newAmountPaid = parseFloat(loan.amountPaid) + parseFloat(repayment.amount) + lateFee;
            const newPrincipalPaid = parseFloat(loan.principalPaid) + parseFloat(repayment.principalAmount);
            const newInterestPaid = parseFloat(loan.interestPaid) + parseFloat(repayment.interestAmount) + parseFloat(repayment.penaltyAmount) + lateFee;
            const newRemainingPrincipal = parseFloat(loan.remainingPrincipal) - parseFloat(repayment.principalAmount);

            await loan.update({
                amountPaid: newAmountPaid,
                principalPaid: newPrincipalPaid,
                interestPaid: newInterestPaid,
                remainingPrincipal: newRemainingPrincipal,
                paymentCount: loan.paymentCount + 1,
                latePaymentCount: daysLate > 0 ? loan.latePaymentCount + 1 : loan.latePaymentCount
            }, { transaction });

            if (newRemainingPrincipal <= 0) {
                await loan.update({ status: 'completed' }, { transaction });
            } else {
                const nextRepayment = await Repayment.findOne({
                    where: {
                        loanId: loan.id,
                        status: 'pending'
                    },
                    order: [['repaymentNumber', 'ASC']],
                    transaction
                });

                if (nextRepayment) {
                    await loan.update({
                        nextPaymentDate: nextRepayment.dueDate
                    }, { transaction });
                }
            }

            await transaction.commit();

            logger.info(`Repayment made for loan ${loan.loanNumber}: ${repayment.amount}`);

            return {
                repayment,
                loan,
                lateFee
            };
        } catch (error) {
            await transaction.rollback();
            logger.error('Make repayment error:', error);
            throw error;
        }
    }

    async getLoanStatistics() {
        try {
            const totalLoans = await Loan.count();
            const pendingLoans = await Loan.count({ where: { status: 'pending' } });
            const approvedLoans = await Loan.count({ where: { status: 'approved' } });
            const disbursedLoans = await Loan.count({ where: { status: 'disbursed' } });
            const activeLoans = await Loan.count({ where: { status: 'active' } });
            const completedLoans = await Loan.count({ where: { status: 'completed' } });
            const defaultedLoans = await Loan.count({ where: { status: 'defaulted' } });

            const totalDisbursed = await Loan.sum('principalAmount', {
                where: { status: ['disbursed', 'active', 'completed'] }
            });

            const totalRecovered = await Loan.sum('amountPaid', {
                where: { status: ['disbursed', 'active', 'completed'] }
            });

            const outstandingAmount = await Loan.sum('remainingPrincipal', {
                where: { status: ['disbursed', 'active'] }
            });

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
