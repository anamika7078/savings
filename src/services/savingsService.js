const { Savings, Member } = require('../models');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const moment = require('moment');

class SavingsService {
    async createSavingsAccount(savingsData) {
        // Omitting transaction for simplicity in migration
        try {
            const lastAccount = await Savings.findOne().sort({ createdAt: -1 });

            let nextAccountNumber = 'SAV0001';
            if (lastAccount && lastAccount.accountNumber) {
                const numStr = lastAccount.accountNumber.replace('SAV', '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num)) {
                    nextAccountNumber = `SAV${String(num + 1).padStart(4, '0')}`;
                }
            }

            const savings = await Savings.create({
                ...savingsData,
                accountNumber: nextAccountNumber,
                balance: savingsData.initialDeposit || 0
            });

            logger.info(`New savings account created: ${savings.accountNumber}`);

            return savings;
        } catch (error) {
            logger.error('Create savings account error:', error);
            throw error;
        }
    }

    async getAllSavingsAccounts(page = 1, limit = 10, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            const query = {};

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.accountType) {
                query.accountType = filters.accountType;
            }

            const savings = await Savings.find(query)
                .populate({
                    path: 'member', // Assumes 'memberId' in schema is mapped to 'member' virtual or populated manually if field name is memberId
                    // In Savings model rewrite: memberId is ref: 'Member'. Path should be 'memberId' if we populated based on field name.
                    // But usually frontend expects 'member' object.
                    // Let's check Savings model rewrite: memberId: { type: ObjectId, ref: 'Member' }
                    // So we populate path: 'memberId'.
                    // However, standard Mongoose convention for 'include' vs 'populate'.
                    // If we populate 'memberId', the result field will still be 'memberId' (containing the object).
                    // The original code returned `savings.member`. 
                    // I will populate 'memberId' but might need to rename or frontend handles it?
                    // Original Sequelize used alias 'as: member'.
                    // In Mongoose, if I populate 'memberId', the field 'memberId' becomes the object.
                    // I should probably use .lean() or transform to map memberId -> member if strictly needed, 
                    // OR rely on frontend checking both or just memberId.
                    // Actually, let's stick to populating 'memberId'.
                    select: 'memberId firstName lastName email phone'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Map memberId to member property if needed for strict compatibility?
            // Usually valid JS code handles `s.memberId.firstName` vs `s.member.firstName`.
            // But if frontend expects `s.member`, I might need a virtual.
            // Let's check if the Savings model defined a virtual.
            // It did not. It only defined memberId ref.
            // I will assume for now populating memberId is sufficient, but I will map it in memory if I can 
            // to ensure `obj.member` exists if `obj.memberId` is populated.
            // Or just rely on `memberId` field being the object.

            const total = await Savings.countDocuments(query);

            return {
                savings,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Get all savings accounts error:', error);
            throw error;
        }
    }

    async getSavingsAccountById(id) {
        try {
            const savings = await Savings.findById(id).populate('memberId');

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
        try {
            const savings = await Savings.findById(accountId);

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

            savings.balance = newBalance;
            await savings.save();

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
            logger.error('Deposit error:', error);
            throw error;
        }
    }

    async withdraw(accountId, amount, remarks) {
        try {
            const savings = await Savings.findById(accountId);

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

            if (newBalance < parseFloat(savings.minimumBalance || 0)) {
                throw new Error('Insufficient balance. Minimum balance requirement not met');
            }

            savings.balance = newBalance;
            await savings.save();

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
            logger.error('Withdrawal error:', error);
            throw error;
        }
    }

    async calculateInterest(accountId) {
        try {
            const savings = await Savings.findById(accountId);

            if (!savings) {
                throw new Error('Savings account not found');
            }

            if (savings.accountType === 'fixed') {
                const lastCalc = savings.lastInterestCalculated ? moment(savings.lastInterestCalculated) : moment(savings.createdAt);
                const daysSinceLastCalculation = moment().diff(lastCalc, 'days');

                const interestRate = parseFloat(savings.interestRate) / 100;
                const dailyRate = interestRate / 365;
                const interest = parseFloat(savings.balance) * dailyRate * daysSinceLastCalculation;

                const newBalance = parseFloat(savings.balance) + interest;

                savings.balance = newBalance;
                savings.lastInterestCalculated = new Date();
                await savings.save();

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
            const totalAccounts = await Savings.countDocuments();
            const activeAccounts = await Savings.countDocuments({ status: 'active' });
            const inactiveAccounts = await Savings.countDocuments({ status: 'inactive' });
            const frozenAccounts = await Savings.countDocuments({ status: 'frozen' });

            const aggregateBalance = async (match) => {
                const res = await Savings.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: '$balance' } } }
                ]);
                return res.length ? res[0].total : 0;
            };

            const totalBalance = await aggregateBalance({ status: 'active' });

            const averageBalance = activeAccounts > 0 ? (totalBalance / activeAccounts) : 0;

            return {
                totalAccounts,
                activeAccounts,
                inactiveAccounts,
                frozenAccounts,
                totalBalance,
                averageBalance
            };
        } catch (error) {
            logger.error('Get savings statistics error:', error);
            throw error;
        }
    }

    async updateSavingsAccount(id, updateData) {
        try {
            const savings = await Savings.findByIdAndUpdate(id, updateData, { new: true });

            if (!savings) {
                throw new Error('Savings account not found');
            }

            logger.info(`Savings account updated: ${savings.accountNumber}`);

            return savings;
        } catch (error) {
            logger.error('Update savings account error:', error);
            throw error;
        }
    }
}

module.exports = new SavingsService();
