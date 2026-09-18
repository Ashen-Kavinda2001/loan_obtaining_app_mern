const crypto        = require('crypto');
const { User, PasswordReset } = require('../models');
const { sendOtpEmail } = require('../utils/mailer');

// Cryptographically secure HMAC hash for OTP with server secret and per-user email salt
const hashOtp = (email, otp) => {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${email}:${otp}`)
    .digest('hex');
};

// @desc    Request a password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string')
      return res.status(400).json({ message: 'A valid email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      // Return 200 without exposing account existence
      return res.json({ message: 'If that email exists, an OTP has been sent.' });
    }

    // Invalidate any previous OTPs for this email
    await PasswordReset.destroy({ where: { email: normalizedEmail } });

    // Generate a cryptographically strong 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = hashOtp(normalizedEmail, rawOtp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await PasswordReset.create({
      email: normalizedEmail,
      otp: hashedOtp,
      expiresAt,
      attempts: 0,
    });

    await sendOtpEmail(normalizedEmail, rawOtp);

    res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('[forgot-password] Error sending OTP email:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Please verify server email configuration.' });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword || typeof email !== 'string')
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });

    if (typeof newPassword !== 'string' || newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    // Password complexity: requires at least 1 uppercase, 1 lowercase, 1 number
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!complexityRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const record = await PasswordReset.findOne({
      where: {
        email: normalizedEmail,
        used:  false,
      },
      order: [['createdAt', 'DESC']],
    });

    if (!record) {
      return res.status(400).json({
        message: 'No active reset request found for this email. Please request a new code.',
      });
    }

    // Check attempt lockout threshold
    if (record.attempts >= 3) {
      await record.destroy();
      return res.status(429).json({
        message: 'Too many failed attempts. This code has been permanently invalidated. Please request a new one.',
      });
    }

    if (new Date() > record.expiresAt) {
      await record.destroy();
      return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
    }

    // Timing-safe comparison of HMAC-SHA256 hash
    const candidateHash = hashOtp(normalizedEmail, cleanOtp);
    const isMatch =
      record.otp.length === candidateHash.length &&
      crypto.timingSafeEqual(Buffer.from(record.otp, 'hex'), Buffer.from(candidateHash, 'hex'));

    if (!isMatch) {
      record.attempts += 1;
      await record.save();

      const remaining = 3 - record.attempts;
      if (remaining <= 0) {
        await record.destroy();
        return res.status(429).json({
          message: 'Too many incorrect attempts. This code has been permanently invalidated.',
        });
      }

      return res.status(400).json({
        message: `Invalid code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
      });
    }

    // Mark OTP as used
    record.used = true;
    await record.save();

    // Update user password and increment tokenVersion to revoke all prior JWTs
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ message: 'User account not found' });

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in with your new credentials.' });
  } catch (err) {
    console.error('[verify-otp] Internal error:', err.message);
    res.status(500).json({ message: 'An error occurred while verifying the reset code.' });
  }
};

module.exports = { forgotPassword, verifyOtp };


