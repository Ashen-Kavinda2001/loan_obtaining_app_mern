const express = require('express');
const { login, getMe, updateCredentials, logout } = require('../controllers/authController');
const { forgotPassword, verifyOtp }               = require('../controllers/resetController');
const { protect }                                 = require('../middleware/auth');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// ── Rate Limiters ──────────────────────────────────────────
// Limit login attempts: 30 attempts per 30 minutes per IP (brute-force defense)
// Single-admin system — limit is relaxed to avoid accidental lockouts during normal use.
const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again after 30 minutes.' },
});

// Limit password reset requests: 5 per 15 min per IP
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
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
