const { Repayment, Loan, Member } = require('../models');
const { sequelize } = require('../models');
const logger = require('../config/logger');
const moment = require('moment');

class RepaymentService {
    async getAllRepayments(page = 1, limit = 10, filters = {}) {
        try {
            const where = {};

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.memberId) {
                where.memberId = filters.memberId;
            }

            if (filters.loanId) {
                where.loanId = filters.loanId;
            }

            if (filters.startDate && filters.endDate) {
                where.dueDate = {
                    [sequelize.Sequelize.Op.between]: [filters.startDate, filters.endDate]
                };
            }

            const offset = (page - 1) * limit;

            const { count, rows: repayments } = await Repayment.findAndCountAll({
                where,
                include: [
                    {
                        model: Loan,
                        as: 'loan',
                        include: [
                            {
                                model: Member,
                                as: 'member',
                                attributes: ['id', 'firstName', 'lastName', 'memberId']
                            }
                        ]
                    },
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['id', 'firstName', 'lastName', 'memberId']
                    }
                ],
                order: [['dueDate', 'DESC']],
                limit,
                offset
            });

            return {
                repayments,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            logger.error('Get all repayments error:', error);
            throw error;
        }
    }

    async getRepaymentById(id) {
        try {
            const repayment = await Repayment.findByPk(id, {
                include: [
                    {
                        model: Loan,
                        as: 'loan',
                        include: [
                            {
                                model: Member,
                                as: 'member',
                                attributes: ['id', 'firstName', 'lastName', 'memberId']
                            }
                        ]
                    },
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['id', 'firstName', 'lastName', 'memberId']
                    }
                ]
            });

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
        const transaction = await sequelize.transaction();

        try {
            const repayment = await Repayment.findByPk(id, {
                include: [
                    {
                        model: Loan,
                        as: 'loan'
                    }
                ],
                transaction
            });

            if (!repayment) {
                throw new Error('Repayment not found');
            }

            if (repayment.status === 'paid') {
                throw new Error('Repayment is already paid');
            }

            // Update repayment
            await repayment.update({
                status: 'paid',
                paymentDate: moment().format('YYYY-MM-DD'),
                paymentMethod: paymentData.paymentMethod,
                transactionId: paymentData.transactionId,
                remarks: paymentData.remarks
            }, { transaction });

            // Update loan remaining amount
            const loan = repayment.loan;
            const newRemainingAmount = parseFloat(loan.remainingAmount) - parseFloat(repayment.amount);

            await loan.update({
                remainingAmount: newRemainingAmount,
                status: newRemainingAmount <= 0 ? 'completed' : loan.status
            }, { transaction });

            await transaction.commit();

            logger.info(`Repayment made: ${id} for loan: ${loan.id}`);

            return await this.getRepaymentById(id);
        } catch (error) {
            await transaction.rollback();
            logger.error('Make repayment error:', error);
            throw error;
        }
    }

    async getOverdueRepayments() {
        try {
            const overdueRepayments = await Repayment.findAll({
                where: {
                    status: 'pending',
                    dueDate: {
                        [sequelize.Sequelize.Op.lt]: moment().startOf('day').toDate()
                    }
                },
                include: [
                    {
                        model: Loan,
                        as: 'loan',
                        include: [
                            {
                                model: Member,
                                as: 'member',
                                attributes: ['id', 'firstName', 'lastName', 'memberId']
                            }
                        ]
                    },
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['id', 'firstName', 'lastName', 'memberId']
                    }
                ],
                order: [['dueDate', 'ASC']]
            });

            return overdueRepayments;
        } catch (error) {
            logger.error('Get overdue repayments error:', error);
            throw error;
        }
    }

    async getRepaymentStatistics() {
        try {
            const total = await Repayment.count();
            const paid = await Repayment.count({ where: { status: 'paid' } });
            const pending = await Repayment.count({ where: { status: 'pending' } });
            const overdue = await Repayment.count({
                where: {
                    status: 'pending',
                    dueDate: {
                        [sequelize.Sequelize.Op.lt]: moment().startOf('day').toDate()
                    }
                }
            });

            const totalAmount = await Repayment.sum('amount');
            const paidAmount = await Repayment.sum('amount', {
                where: { status: 'paid' }
            });
            const pendingAmount = await Repayment.sum('amount', {
                where: { status: 'pending' }
            });

            const thisMonth = await Repayment.findAll({
                where: {
                    paymentDate: {
                        [sequelize.Sequelize.Op.gte]: moment().startOf('month').toDate()
                    }
                },
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                raw: true
            });

            return {
                total,
                paid,
                pending,
                overdue,
                totalAmount: totalAmount || 0,
                paidAmount: paidAmount || 0,
                pendingAmount: pendingAmount || 0,
                thisMonth: {
                    count: thisMonth[0]?.count || 0,
                    total: thisMonth[0]?.total || 0
                }
            };
        } catch (error) {
            logger.error('Get repayment statistics error:', error);
            throw error;
        }
    }

    async generateRepaymentSchedule(loanId) {
        try {
            const loan = await Loan.findByPk(loanId);

            if (!loan) {
                throw new Error('Loan not found');
            }

            const repayments = [];
            const emi = parseFloat(loan.emiAmount);
            const principalAmount = parseFloat(loan.principalAmount);
            const tenure = parseInt(loan.loanTerm);
            const interestRate = parseFloat(loan.interestRate);
            const startDate = moment(loan.disbursementDate || moment());

            let remainingPrincipal = principalAmount;
            const monthlyInterestRate = interestRate / 12 / 100;

            for (let i = 1; i <= tenure; i++) {
                const interestAmount = remainingPrincipal * monthlyInterestRate;
                const principalAmount = emi - interestAmount;
                const dueDate = moment(startDate).add(i, 'months');

                repayments.push({
                    repaymentNumber: i,
                    amount: emi,
                    principalAmount: principalAmount,
                    interestAmount: interestAmount,
                    dueDate: dueDate.format('YYYY-MM-DD'),
                    status: moment().isAfter(dueDate) ? 'overdue' : 'pending'
                });

                remainingPrincipal -= principalAmount;
            }

            return repayments;
        } catch (error) {
            logger.error('Generate repayment schedule error:', error);
            throw error;
        }
    }

    async updateRepayment(id, updateData) {
        try {
            const repayment = await Repayment.findByPk(id);

            if (!repayment) {
                throw new Error('Repayment not found');
            }

            await repayment.update(updateData);

            logger.info(`Repayment updated: ${id}`);

            return repayment;
        } catch (error) {
            logger.error('Update repayment error:', error);
            throw error;
        }
    }
}

module.exports = new RepaymentService();
