const { Savings, Member } = require('../models');
const { sequelize } = require('../models');
const logger = require('../config/logger');
const moment = require('moment');

class SavingsService {
    async createSavingsAccount(savingsData) {
        const transaction = await sequelize.transaction();

        try {
            const lastAccount = await Savings.findOne({
                order: [['id', 'DESC']],
                transaction
            });

            const accountNumber = lastAccount ? `SAV${String(lastAccount.id + 1).padStart(4, '0')}` : 'SAV0001';

            const savings = await Savings.create({
                ...savingsData,
                accountNumber,
                balance: savingsData.initialDeposit || 0
            }, { transaction });

            await transaction.commit();

            logger.info(`New savings account created: ${savings.accountNumber}`);

            return savings;
        } catch (error) {
            await transaction.rollback();
            logger.error('Create savings account error:', error);
            throw error;
        }
    }

    async getAllSavingsAccounts(page = 1, limit = 10, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            const where = {};

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.accountType) {
                where.accountType = filters.accountType;
            }

            const { count, rows } = await Savings.findAndCountAll({
                where,
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['memberId', 'firstName', 'lastName', 'email', 'phone']
                    }
                ],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            return {
                savings: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            logger.error('Get all savings accounts error:', error);
            throw error;
        }
    }

    async getSavingsAccountById(id) {
        try {
            const savings = await Savings.findByPk(id, {
                include: [
                    {
                        model: Member,
                        as: 'member'
                    }
                ]
            });

            if (!savings) {
                throw new Error('Savings account not found');
            }

            return savings;
        } catch (error) {
            logger.error('Get savings account by ID error:', error);
            throw error;
        }
    }

    async deposit(accountId, amount, remarks) {
        const transaction = await sequelize.transaction();

        try {
            const savings = await Savings.findByPk(accountId, { transaction });

            if (!savings) {
                throw new Error('Savings account not found');
            }

            if (savings.status !== 'active') {
                throw new Error('Cannot deposit to inactive account');
            }

            if (amount <= 0) {
                throw new Error('Deposit amount must be positive');
            }

            const newBalance = parseFloat(savings.balance) + parseFloat(amount);

            await savings.update({
                balance: newBalance
            }, { transaction });

            await transaction.commit();

            logger.info(`Deposit made to account ${savings.accountNumber}: ${amount}`);

            return {
                account: savings,
                transaction: {
                    type: 'deposit',
                    amount,
                    balance: newBalance,
                    remarks,
                    date: new Date()
                }
            };
        } catch (error) {
            await transaction.rollback();
            logger.error('Deposit error:', error);
            throw error;
        }
    }

    async withdraw(accountId, amount, remarks) {
        const transaction = await sequelize.transaction();

        try {
            const savings = await Savings.findByPk(accountId, { transaction });

            if (!savings) {
                throw new Error('Savings account not found');
            }

            if (savings.status !== 'active') {
                throw new Error('Cannot withdraw from inactive account');
            }

            if (amount <= 0) {
                throw new Error('Withdrawal amount must be positive');
            }

            const newBalance = parseFloat(savings.balance) - parseFloat(amount);

            if (newBalance < parseFloat(savings.minimumBalance)) {
                throw new Error('Insufficient balance. Minimum balance requirement not met');
            }

            await savings.update({
                balance: newBalance
            }, { transaction });

            await transaction.commit();

            logger.info(`Withdrawal made from account ${savings.accountNumber}: ${amount}`);

            return {
                account: savings,
                transaction: {
                    type: 'withdrawal',
                    amount,
                    balance: newBalance,
                    remarks,
                    date: new Date()
                }
            };
        } catch (error) {
            await transaction.rollback();
            logger.error('Withdrawal error:', error);
            throw error;
        }
    }

    async calculateInterest(accountId) {
        try {
            const savings = await Savings.findByPk(accountId);

            if (!savings) {
                throw new Error('Savings account not found');
            }

            if (savings.accountType === 'fixed') {
                const daysSinceLastCalculation = moment().diff(moment(savings.lastInterestCalculated), 'days');
                const interestRate = parseFloat(savings.interestRate) / 100;
                const dailyRate = interestRate / 365;
                const interest = parseFloat(savings.balance) * dailyRate * daysSinceLastCalculation;

                const newBalance = parseFloat(savings.balance) + interest;

                await savings.update({
                    balance: newBalance,
                    lastInterestCalculated: new Date()
                });

                logger.info(`Interest calculated for account ${savings.accountNumber}: ${interest}`);

                return {
                    interest,
                    newBalance,
                    lastCalculated: new Date()
                };
            }

            return { message: 'Interest calculation not applicable for this account type' };
        } catch (error) {
            logger.error('Calculate interest error:', error);
            throw error;
        }
    }

    async getSavingsStatistics() {
        try {
            const totalAccounts = await Savings.count();
            const activeAccounts = await Savings.count({ where: { status: 'active' } });
            const inactiveAccounts = await Savings.count({ where: { status: 'inactive' } });
            const frozenAccounts = await Savings.count({ where: { status: 'frozen' } });

            const totalBalance = await Savings.sum('balance', {
                where: { status: 'active' }
            });

            const averageBalance = totalBalance / activeAccounts || 0;

            return {
                totalAccounts,
                activeAccounts,
                inactiveAccounts,
                frozenAccounts,
                totalBalance: totalBalance || 0,
                averageBalance
            };
        } catch (error) {
            logger.error('Get savings statistics error:', error);
            throw error;
        }
    }

    async updateSavingsAccount(id, updateData) {
        try {
            const savings = await Savings.findByPk(id);

            if (!savings) {
                throw new Error('Savings account not found');
            }

            await savings.update(updateData);

            logger.info(`Savings account updated: ${savings.accountNumber}`);

            return savings;
        } catch (error) {
            logger.error('Update savings account error:', error);
            throw error;
        }
    }
}

module.exports = new SavingsService();
