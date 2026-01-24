const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middlewares/auth');
const { validateLogin, validateRegister } = require('../middlewares/validation');

router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);
router.get('/me', auth, authController.getCurrentUser);
router.put('/profile', auth, authController.updateProfile);
router.put('/change-password', auth, authController.changePassword);
router.post('/logout', auth, authController.logout);

module.exports = router;
