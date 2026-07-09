const crypto        = require('crypto');
const User          = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { sendOtpEmail } = require('../utils/mailer');

// @desc    Request a password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond with success to avoid email enumeration
    if (!user) return res.json({ message: 'If that email exists, an OTP has been sent.' });

    // Invalidate any previous OTPs for this email
    await PasswordReset.deleteMany({ email: email.toLowerCase() });

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await PasswordReset.create({ email: email.toLowerCase(), otp, expiresAt });
    await sendOtpEmail(email, otp);

    res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Check your email configuration.' });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const record = await PasswordReset.findOne({
      email: email.toLowerCase(),
      used:  false,
    }).sort({ createdAt: -1 });

    if (!record)
      return res.status(400).json({ message: 'No reset request found. Please request a new OTP.' });

    if (new Date() > record.expiresAt)
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    if (record.otp !== otp)
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });

    // Mark OTP as used
    record.used = true;
    await record.save();

    // Update user password (pre-save hook hashes it)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { forgotPassword, verifyOtp };
