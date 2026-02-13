const { Member, Savings, Loan } = require('../models');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const moment = require('moment');

class MemberService {
    async createMember(memberData) {
        // Start a session for transaction if needed, but for simplicity we'll try without first, 
        // or ensure DB is a replica set. Assuming standalone for now which doesn't support transactions well.
        // If atomic, use session.

        try {
            // Member ID generation logic
            const lastMember = await Member.findOne().sort({ createdAt: -1 });

            // Logic to parse last ID creates dependency on format 'MEMXXXX'
            // For now, let's keep it simple or retry the logic from Sequelize version roughly.
            // If lastMember uses standard _id, we can't increment. 
            // We need to look at memberId field specifically.
            const lastMemberId = lastMember?.memberId;
            let nextId = 'MEM0001';

            if (lastMemberId) {
                const numStr = lastMemberId.replace('MEM', '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num)) {
                    nextId = `MEM${String(num + 1).padStart(4, '0')}`;
                }
            }

            const member = await Member.create({
                ...memberData,
                memberId: nextId,
                joinDate: memberData.joinDate || new Date()
            });

            logger.info(`New member created: ${member.memberId}`);
            return member;
        } catch (error) {
            logger.error('Create member error:', error);
            throw error;
        }
    }

    async getAllMembers(page = 1, limit = 10, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            const query = {};

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.search) {
                const searchRegex = new RegExp(filters.search, 'i');
                query.$or = [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { memberId: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ];
            }

            const members = await Member.find(query)
                .populate({ path: 'savings', select: 'accountNumber balance status' })
                .populate({
                    path: 'loans',
                    match: { status: { $in: ['active', 'disbursed'] } },
                    select: 'loanNumber principalAmount status remainingPrincipal'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Member.countDocuments(query);

            return {
                members,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Get all members error:', error);
            throw error;
        }
    }

    async getMemberById(id) {
        try {
            const member = await Member.findById(id)
                .populate('savings')
                .populate({
                    path: 'loans',
                    populate: [
                        { path: 'repayments' },
                        // Note: 'fines' virtual on Loan might need to be populated carefully if it exists
                    ]
                })
                // For fines directly on member 
                // Mongoose doesn't have simple 'include' deep nesting like Sequelize for everything unless virtuals set up
                // Assuming we might need to fetch fines separately or via virtual populate if defined
                // Let's assume virtuals work
                ;

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
            const member = await Member.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

            if (!member) {
                throw new Error('Member not found');
            }

            logger.info(`Member updated: ${member.memberId}`);
            return member;
        } catch (error) {
            logger.error('Update member error:', error);
            throw error;
        }
    }

    async deleteMember(id) {
        try {
            const member = await Member.findById(id);

            if (!member) {
                throw new Error('Member not found');
            }

            const hasActiveLoans = await Loan.countDocuments({
                memberId: id,
                status: { $in: ['active', 'disbursed', 'approved'] }
            });

            if (hasActiveLoans > 0) {
                throw new Error('Cannot delete member with active loans');
            }

            const hasSavings = await Savings.countDocuments({
                memberId: id,
                balance: { $gt: 0 }
            });

            if (hasSavings > 0) {
                throw new Error('Cannot delete member with non-zero savings balance');
            }

            await Member.findByIdAndDelete(id);

            logger.info(`Member deleted: ${member.memberId}`);

            return { message: 'Member deleted successfully' };
        } catch (error) {
            logger.error('Delete member error:', error);
            throw error;
        }
    }

    async updateAllMembersStatus(status) {
        try {
            const result = await Member.updateMany(
                {}, // Update all documents
                { status: status }
            );

            logger.info(`Updated ${result.modifiedCount} members to ${status} status`);
            return result;
        } catch (error) {
            logger.error('Update all members status error:', error);
            throw error;
        }
    }

    async getMemberStatistics() {
        try {
            const total = await Member.countDocuments();
            const active = await Member.countDocuments({ status: 'active' });
            const inactive = await Member.countDocuments({ status: 'inactive' });
            const newThisMonth = await Member.countDocuments({
                joinDate: {
                    $gte: moment().startOf('month').toDate()
                }
            });

            return { total, active, inactive, newThisMonth };
        } catch (error) {
            logger.error('Get member statistics error:', error);
            throw error;
        }
    }
}

module.exports = new MemberService();
