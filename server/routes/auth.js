const express = require('express');
const { login, getMe, updateCredentials } = require('../controllers/authController');
const { forgotPassword, verifyOtp }       = require('../controllers/resetController');
const { protect }                         = require('../middleware/auth');

const router = express.Router();

// Public
router.post('/login',           login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp',      verifyOtp);

// Private
router.get('/me',                    protect, getMe);
router.put('/update-credentials',    protect, updateCredentials);

module.exports = router;
