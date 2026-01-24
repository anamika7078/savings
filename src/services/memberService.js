const { Member, Savings, Loan } = require('../models');
const { sequelize } = require('../models');
const logger = require('../config/logger');
const moment = require('moment');

class MemberService {
    async createMember(memberData) {
        const transaction = await sequelize.transaction();

        try {
            const lastMember = await Member.findOne({
                order: [['id', 'DESC']],
                transaction
            });

            const memberId = lastMember ? `MEM${String(lastMember.id + 1).padStart(4, '0')}` : 'MEM0001';

            const member = await Member.create({
                ...memberData,
                memberId,
                joinDate: memberData.joinDate || new Date()
            }, { transaction });

            await transaction.commit();

            logger.info(`New member created: ${member.memberId}`);

            return member;
        } catch (error) {
            await transaction.rollback();
            logger.error('Create member error:', error);
            throw error;
        }
    }

    async getAllMembers(page = 1, limit = 10, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            const where = {};

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.search) {
                const { [sequelize.Sequelize.Op.or]: searchCondition } = {
                    [sequelize.Sequelize.Op.or]: [
                        { firstName: { [sequelize.Sequelize.Op.like]: `%${filters.search}%` } },
                        { lastName: { [sequelize.Sequelize.Op.like]: `%${filters.search}%` } },
                        { memberId: { [sequelize.Sequelize.Op.like]: `%${filters.search}%` } },
                        { email: { [sequelize.Sequelize.Op.like]: `%${filters.search}%` } },
                        { phone: { [sequelize.Sequelize.Op.like]: `%${filters.search}%` } }
                    ]
                };
                Object.assign(where, searchCondition);
            }

            const { count, rows } = await Member.findAndCountAll({
                where,
                include: [
                    {
                        model: Savings,
                        as: 'savings',
                        attributes: ['accountNumber', 'balance', 'status']
                    },
                    {
                        model: Loan,
                        as: 'loans',
                        attributes: ['loanNumber', 'principalAmount', 'status', 'remainingPrincipal'],
                        where: { status: ['active', 'disbursed'] },
                        required: false
                    }
                ],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            return {
                members: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            logger.error('Get all members error:', error);
            throw error;
        }
    }

    async getMemberById(id) {
        try {
            const member = await Member.findByPk(id, {
                include: [
                    {
                        model: Savings,
                        as: 'savings'
                    },
                    {
                        model: Loan,
                        as: 'loans',
                        include: [
                            {
                                model: Loan.sequelize.models.Repayment,
                                as: 'repayments'
                            }
                        ]
                    },
                    {
                        model: Loan.sequelize.models.Fine,
                        as: 'fines'
                    }
                ]
            });

            if (!member) {
                throw new Error('Member not found');
            }

            return member;
        } catch (error) {
            logger.error('Get member by ID error:', error);
            throw error;
        }
    }

    async updateMember(id, updateData) {
        try {
            const member = await Member.findByPk(id);

            if (!member) {
                throw new Error('Member not found');
            }

            await member.update(updateData);

            logger.info(`Member updated: ${member.memberId}`);

            return member;
        } catch (error) {
            logger.error('Update member error:', error);
            throw error;
        }
    }

    async deleteMember(id) {
        const transaction = await sequelize.transaction();

        try {
            const member = await Member.findByPk(id, { transaction });

            if (!member) {
                throw new Error('Member not found');
            }

            const hasActiveLoans = await Loan.count({
                where: {
                    memberId: id,
                    status: ['active', 'disbursed', 'approved']
                },
                transaction
            });

            if (hasActiveLoans > 0) {
                throw new Error('Cannot delete member with active loans');
            }

            const hasSavings = await Savings.count({
                where: {
                    memberId: id,
                    balance: { [sequelize.Sequelize.Op.gt]: 0 }
                },
                transaction
            });

            if (hasSavings > 0) {
                throw new Error('Cannot delete member with non-zero savings balance');
            }

            await member.destroy({ transaction });

            await transaction.commit();

            logger.info(`Member deleted: ${member.memberId}`);

            return { message: 'Member deleted successfully' };
        } catch (error) {
            await transaction.rollback();
            logger.error('Delete member error:', error);
            throw error;
        }
    }

    async getMemberStatistics() {
        try {
            const totalMembers = await Member.count();
            const activeMembers = await Member.count({ where: { status: 'active' } });
            const inactiveMembers = await Member.count({ where: { status: 'inactive' } });
            const suspendedMembers = await Member.count({ where: { status: 'suspended' } });

            const newMembersThisMonth = await Member.count({
                where: {
                    joinDate: {
                        [sequelize.Sequelize.Op.gte]: moment().startOf('month').toDate()
                    }
                }
            });

            return {
                totalMembers,
                activeMembers,
                inactiveMembers,
                suspendedMembers,
                newMembersThisMonth
            };
        } catch (error) {
            logger.error('Get member statistics error:', error);
            throw error;
        }
    }
}

module.exports = new MemberService();
