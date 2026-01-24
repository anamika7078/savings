const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { auth, adminAuth } = require('../middlewares/auth');
const { validateMember } = require('../middlewares/validation');

router.post('/', auth, adminAuth, validateMember, memberController.createMember);
router.get('/', auth, memberController.getAllMembers);
router.get('/statistics', auth, adminAuth, memberController.getMemberStatistics);
router.get('/:id', auth, memberController.getMemberById);
router.put('/:id', auth, adminAuth, validateMember, memberController.updateMember);
router.delete('/:id', auth, adminAuth, memberController.deleteMember);

module.exports = router;
