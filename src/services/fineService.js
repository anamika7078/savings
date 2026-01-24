const { Fine, Member, Loan, User } = require('../models');
const { sequelize } = require('../models');
const logger = require('../config/logger');
const moment = require('moment');

class FineService {
    async createFine(fineData) {
        const transaction = await sequelize.transaction();

        try {
            const lastFine = await Fine.findOne({
                order: [['id', 'DESC']],
                transaction
            });

            const fineNumber = lastFine ? `FIN${String(lastFine.id + 1).padStart(4, '0')}` : 'FIN0001';

            const fine = await Fine.create({
                ...fineData,
                fineNumber,
                date: new Date(),
                dueDate: fineData.dueDate || moment().add(30, 'days').toDate()
            }, { transaction });

            await transaction.commit();

            logger.info(`New fine created: ${fine.fineNumber}`);

            return fine;
        } catch (error) {
            await transaction.rollback();
            logger.error('Create fine error:', error);
            throw error;
        }
    }

    async getAllFines(page = 1, limit = 10, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            const where = {};

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.type) {
                where.type = filters.type;
            }

            if (filters.memberId) {
                where.memberId = filters.memberId;
            }

            const { count, rows } = await Fine.findAndCountAll({
                where,
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['memberId', 'firstName', 'lastName', 'phone']
                    },
                    {
                        model: Loan,
                        as: 'loan',
                        attributes: ['loanNumber', 'principalAmount'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'waiver',
                        attributes: ['username'],
                        required: false
                    }
                ],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            return {
                fines: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            logger.error('Get all fines error:', error);
            throw error;
        }
    }

    async getFineById(id) {
        try {
            const fine = await Fine.findByPk(id, {
                include: [
                    {
                        model: Member,
                        as: 'member'
                    },
                    {
                        model: Loan,
                        as: 'loan',
                        required: false
                    },
                    {
                        model: User,
                        as: 'waiver',
                        required: false
                    }
                ]
            });

            if (!fine) {
                throw new Error('Fine not found');
            }

            return fine;
        } catch (error) {
            logger.error('Get fine by ID error:', error);
            throw error;
        }
    }

    async payFine(id, paymentMethod, transactionId) {
        const transaction = await sequelize.transaction();

        try {
            const fine = await Fine.findByPk(id, { transaction });

            if (!fine) {
                throw new Error('Fine not found');
            }

            if (fine.status === 'paid') {
                throw new Error('Fine already paid');
            }

            if (fine.status === 'waived') {
                throw new Error('Cannot pay waived fine');
            }

            await fine.update({
                status: 'paid',
                paymentDate: new Date(),
                paymentMethod,
                transactionId
            }, { transaction });

            await transaction.commit();

            logger.info(`Fine paid: ${fine.fineNumber}`);

            return fine;
        } catch (error) {
            await transaction.rollback();
            logger.error('Pay fine error:', error);
            throw error;
        }
    }

    async waiveFine(id, waiveReason, waivedBy) {
        const transaction = await sequelize.transaction();

        try {
            const fine = await Fine.findByPk(id, { transaction });

            if (!fine) {
                throw new Error('Fine not found');
            }

            if (fine.status === 'paid') {
                throw new Error('Cannot waive paid fine');
            }

            if (fine.status === 'waived') {
                throw new Error('Fine already waived');
            }

            await fine.update({
                status: 'waived',
                waivedBy,
                waiveReason
            }, { transaction });

            await transaction.commit();

            logger.info(`Fine waived: ${fine.fineNumber} by user ${waivedBy}`);

            return fine;
        } catch (error) {
            await transaction.rollback();
            logger.error('Waive fine error:', error);
            throw error;
        }
    }

    async calculateLatePaymentFines() {
        try {
            const { Loan, Repayment } = require('../models');

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
                        where: { status: ['disbursed', 'active'] }
                    }
                ]
            });

            const finesCreated = [];

            for (const repayment of overdueRepayments) {
                const daysLate = moment().diff(moment(repayment.dueDate), 'days');
                const fineAmount = Math.round(repayment.amount * 0.02 * Math.min(daysLate, 30));

                const existingFine = await Fine.findOne({
                    where: {
                        loanId: repayment.loanId,
                        type: 'late_payment',
                        status: 'pending'
                    }
                });

                if (!existingFine && fineAmount > 0) {
                    const fine = await this.createFine({
                        memberId: repayment.memberId,
                        loanId: repayment.loanId,
                        type: 'late_payment',
                        amount: fineAmount,
                        description: `Late payment fine for EMI #${repayment.repaymentNumber}. ${daysLate} days late.`
                    });

                    finesCreated.push(fine);
                }
            }

            logger.info(`Late payment fines calculated: ${finesCreated.length} fines created`);

            return finesCreated;
        } catch (error) {
            logger.error('Calculate late payment fines error:', error);
            throw error;
        }
    }

    async getFineStatistics() {
        try {
            const totalFines = await Fine.count();
            const pendingFines = await Fine.count({ where: { status: 'pending' } });
            const paidFines = await Fine.count({ where: { status: 'paid' } });
            const waivedFines = await Fine.count({ where: { status: 'waived' } });

            const totalAmount = await Fine.sum('amount');
            const paidAmount = await Fine.sum('amount', {
                where: { status: 'paid' }
            });
            const pendingAmount = await Fine.sum('amount', {
                where: { status: 'pending' }
            });

            const finesByType = await Fine.findAll({
                attributes: [
                    'type',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                group: ['type'],
                raw: true
            });

            return {
                totalFines,
                pendingFines,
                paidFines,
                waivedFines,
                totalAmount: totalAmount || 0,
                paidAmount: paidAmount || 0,
                pendingAmount: pendingAmount || 0,
                finesByType
            };
        } catch (error) {
            logger.error('Get fine statistics error:', error);
            throw error;
        }
    }

    async updateFine(id, updateData) {
        try {
            const fine = await Fine.findByPk(id);

            if (!fine) {
                throw new Error('Fine not found');
            }

            await fine.update(updateData);

            logger.info(`Fine updated: ${fine.fineNumber}`);

            return fine;
        } catch (error) {
            logger.error('Update fine error:', error);
            throw error;
        }
    }
}

module.exports = new FineService();
