const memberService = require('../services/memberService');
const logger = require('../config/logger');

class MemberController {
    async createMember(req, res) {
        try {
            const member = await memberService.createMember(req.body);

            res.status(201).json({
                success: true,
                message: 'Member created successfully',
                data: member
            });
        } catch (error) {
            logger.error('Create member controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllMembers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                search: req.query.search
            };

            const result = await memberService.getAllMembers(page, limit, filters);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Get all members controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getMemberById(req, res) {
        try {
            const { id } = req.params;
            const member = await memberService.getMemberById(id);

            res.json({
                success: true,
                data: member
            });
        } catch (error) {
            logger.error('Get member by ID controller error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateMember(req, res) {
        try {
            const { id } = req.params;
            const member = await memberService.updateMember(id, req.body);

            res.json({
                success: true,
                message: 'Member updated successfully',
                data: member
            });
        } catch (error) {
            logger.error('Update member controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteMember(req, res) {
        try {
            const { id } = req.params;
            const result = await memberService.deleteMember(id);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Delete member controller error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getMemberStatistics(req, res) {
        try {
            const statistics = await memberService.getMemberStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get member statistics controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateMemberStatus(req, res) {
        try {
            const { status } = req.body;

            // Update all members with the specified status
            const result = await memberService.updateAllMembersStatus(status);

            res.json({
                success: true,
                message: `Updated ${result.modifiedCount} members to ${status} status`,
                data: {
                    modifiedCount: result.modifiedCount
                }
            });
        } catch (error) {
            logger.error('Update member status controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new MemberController();
