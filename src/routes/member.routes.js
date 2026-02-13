const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { auth, adminAuth } = require('../middlewares/auth');
const { validateMember } = require('../middlewares/validation');
const { body } = require('express-validator');

const validateStatusUpdate = [
    body('status')
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Status must be active, inactive, or suspended'),
    require('../middlewares/validation').handleValidationErrors
];

router.post('/', auth, adminAuth, validateMember, memberController.createMember);
router.get('/', auth, memberController.getAllMembers);
router.get('/statistics', auth, adminAuth, memberController.getMemberStatistics);
router.get('/:id', auth, memberController.getMemberById);
router.put('/:id', auth, adminAuth, validateMember, memberController.updateMember);
router.delete('/:id', auth, adminAuth, memberController.deleteMember);
router.put('/update-status', auth, adminAuth, validateStatusUpdate, memberController.updateMemberStatus);

module.exports = router;
