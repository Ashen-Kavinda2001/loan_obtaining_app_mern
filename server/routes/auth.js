const express = require('express');
const { login, getMe, updateCredentials, logout } = require('../controllers/authController');
const { forgotPassword, verifyOtp }               = require('../controllers/resetController');
const { protect }                                 = require('../middleware/auth');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// ── Rate Limiters ──────────────────────────────────────────
// Relaxed limits with validate: false to prevent cPanel Passenger proxy exceptions
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
});

// Password reset requests: 50 per 15 min per IP
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: 'Too many password reset requests. Please try again after 15 minutes.' },
});

// Public
router.post('/login',           loginLimiter, login);
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/verify-otp',      resetLimiter, verifyOtp);

// Private
router.get('/me',                    protect, getMe);
router.put('/update-credentials',    protect, updateCredentials);
router.post('/logout',               protect, logout);

module.exports = router;
