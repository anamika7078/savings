const { Fine, Member, Loan, User, Repayment } = require('../models');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const moment = require('moment');

class FineService {
    async createFine(fineData) {
        try {
            const lastFine = await Fine.findOne().sort({ createdAt: -1 });

            let nextFineNumber = 'FIN0001';
            if (lastFine && lastFine.fineNumber) {
                const numStr = lastFine.fineNumber.replace('FIN', '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num)) {
                    nextFineNumber = `FIN${String(num + 1).padStart(4, '0')}`;
                }
            }

            // Handle empty loanId - remove it if it's an empty string
            const processedFineData = { ...fineData };
            if (!processedFineData.loanId || processedFineData.loanId === '') {
                delete processedFineData.loanId;
            }

            const fine = await Fine.create({
                ...processedFineData,
                fineNumber: nextFineNumber,
                date: new Date(),
                dueDate: processedFineData.dueDate || moment().add(30, 'days').toDate()
            });

            logger.info(`New fine created: ${fine.fineNumber}`);

            return fine;
        } catch (error) {
            logger.error('Create fine error:', error);
            throw error;
        }
    }

    async getAllFines(page = 1, limit = 10, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            const query = {};

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.type) {
                query.type = filters.type;
            }

            if (filters.memberId) {
                query.memberId = filters.memberId;
            }

            const fines = await Fine.find(query)
                .populate({ path: 'memberId', select: 'memberId firstName lastName phone' })
                .populate({ path: 'loanId', select: 'loanNumber principalAmount' })
                .populate({ path: 'waivedBy', select: 'username' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Fine.countDocuments(query);

            return {
                fines,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Get all fines error:', error);
            throw error;
        }
    }

    async getFineById(id) {
        try {
            const fine = await Fine.findById(id)
                .populate('memberId')
                .populate('loanId')
                .populate('waivedBy');

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
        try {
            const fine = await Fine.findById(id);

            if (!fine) {
                throw new Error('Fine not found');
            }

            if (fine.status === 'paid') {
                throw new Error('Fine already paid');
            }

            if (fine.status === 'waived') {
                throw new Error('Cannot pay waived fine');
            }

            fine.status = 'paid';
            fine.paymentDate = new Date();
            fine.paymentMethod = paymentMethod;
            fine.transactionId = transactionId;
            await fine.save();

            logger.info(`Fine paid: ${fine.fineNumber}`);

            return fine;
        } catch (error) {
            logger.error('Pay fine error:', error);
            throw error;
        }
    }

    async waiveFine(id, waiveReason, waivedBy) {
        try {
            const fine = await Fine.findById(id);

            if (!fine) {
                throw new Error('Fine not found');
            }

            if (fine.status === 'paid') {
                throw new Error('Cannot waive paid fine');
            }

            if (fine.status === 'waived') {
                throw new Error('Fine already waived');
            }

            fine.status = 'waived';
            fine.waivedBy = waivedBy;
            fine.waiveReason = waiveReason;
            await fine.save();

            logger.info(`Fine waived: ${fine.fineNumber} by user ${waivedBy}`);

            return fine;
        } catch (error) {
            logger.error('Waive fine error:', error);
            throw error;
        }
    }

    async calculateLatePaymentFines() {
        try {
            const startOfDay = moment().startOf('day').toDate();

            // Find overdue repayments
            const overdueRepayments = await Repayment.find({
                status: 'pending',
                dueDate: { $lt: startOfDay }
            }).populate({
                path: 'loanId',
                match: { status: { $in: ['disbursed', 'active'] } } // Only active loans
            });

            const finesCreated = [];

            for (const repayment of overdueRepayments) {
                if (!repayment.loanId) continue; // Loan might not match filter or be null

                const daysLate = moment().diff(moment(repayment.dueDate), 'days');
                const fineAmount = Math.round(repayment.amount * 0.02 * Math.min(daysLate, 30));

                const existingFine = await Fine.findOne({
                    loanId: repayment.loanId._id,
                    type: 'late_payment',
                    status: 'pending',
                    // Ideally we should link fine to specific repayment to avoid duplicates for same repayment
                    // Assuming description or metadata could help, but for now replicate logic:
                    // Only one pending late payment fine per loan? 
                    // Or maybe we rely on the scheduled job frequency.
                    // The original code check: 
                    // where: { loanId, type: 'late_payment', status: 'pending' }
                    // This implies if there is already a pending late fine, don't create another.
                });

                if (!existingFine && fineAmount > 0) {
                    const fine = await this.createFine({
                        memberId: repayment.memberId,
                        loanId: repayment.loanId._id,
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
            const totalFines = await Fine.countDocuments();
            const pendingFines = await Fine.countDocuments({ status: 'pending' });
            const paidFines = await Fine.countDocuments({ status: 'paid' });
            const waivedFines = await Fine.countDocuments({ status: 'waived' });

            const aggregateSum = async (match, field) => {
                const res = await Fine.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: `$${field}` } } }
                ]);
                return res.length ? res[0].total : 0;
            };

            const totalAmount = await aggregateSum({}, 'amount');
            const paidAmount = await aggregateSum({ status: 'paid' }, 'amount');
            const pendingAmount = await aggregateSum({ status: 'pending' }, 'amount');

            const finesByType = await Fine.aggregate([
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            return {
                totalFines,
                pendingFines,
                paidFines,
                waivedFines,
                totalAmount,
                paidAmount,
                pendingAmount,
                finesByType: finesByType.map(f => ({
                    type: f._id,
                    count: f.count,
                    total: f.total
                }))
            };
        } catch (error) {
            logger.error('Get fine statistics error:', error);
            throw error;
        }
    }

    async updateFine(id, updateData) {
        try {
            const fine = await Fine.findByIdAndUpdate(id, updateData, { new: true });

            if (!fine) {
                throw new Error('Fine not found');
            }

            logger.info(`Fine updated: ${fine.fineNumber}`);

            return fine;
        } catch (error) {
            logger.error('Update fine error:', error);
            throw error;
        }
    }
}

module.exports = new FineService();
