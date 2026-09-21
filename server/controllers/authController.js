const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Generate a signed JWT token with user ID and tokenVersion
const generateToken = (user) =>
  jwt.sign(
    { id: user.id || user._id, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '7d' }
  );

// COOKIE_SECURE must be explicitly set to 'true' in .env to enable HTTPS-only cookies.
// Decoupled from NODE_ENV so HTTP deployments (cPanel temp IP, HTTP-only sites) still work.
const isCookieSecure = process.env.COOKIE_SECURE === 'true';

// Cookie configuration for HttpOnly session tokens
const COOKIE_OPTIONS = {
  httpOnly: true,                                // Inaccessible to client-side JavaScript (defeats XSS theft)
  secure:   isCookieSecure,                      // Only send over HTTPS when COOKIE_SECURE=true in .env
  sameSite: isCookieSecure ? 'strict' : 'lax',  // 'strict' with HTTPS; 'lax' for HTTP fallback
  maxAge:   7 * 24 * 60 * 60 * 1000,            // 7 days
  path:     '/',
};

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string')
      return res.status(400).json({ message: 'Please provide a valid email and password' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user);

    // Transmit JWT inside secure, HttpOnly cookie (no raw token in response body)
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
      _id:   user.id,
      id:    user.id,
      email: user.email,
      role:  user.role,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// @desc    Update own email and/or password
// @route   PUT /api/auth/update-credentials
// @access  Private
const updateCredentials = async (req, res, next) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string')
      return res.status(400).json({ message: 'Current password is required' });

    const userId = req.user.id || req.user._id;
    const user = await User.findByPk(userId);
    if (!user || !(await user.matchPassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    if (newEmail && typeof newEmail === 'string') {
      const normalizedNewEmail = newEmail.toLowerCase().trim();
      if (normalizedNewEmail !== user.email) {
        const exists = await User.findOne({ where: { email: normalizedNewEmail } });
        if (exists) return res.status(400).json({ message: 'That email is already in use' });
        user.email = normalizedNewEmail;
      }
    }

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }
      // Password complexity: requires at least 1 uppercase, 1 lowercase, 1 number
      const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!complexityRegex.test(newPassword)) {
        return res.status(400).json({
          message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        });
      }
      user.password = newPassword; // beforeSave hook will hash it
      user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate all other active sessions
    }

    await user.save();

    const freshToken = generateToken(user);
    // Refresh the HttpOnly cookie with the fresh tokenVersion
    res.cookie('token', freshToken, COOKIE_OPTIONS);

    res.json({
      _id:   user.id,
      id:    user.id,
      email: user.email,
      role:  user.role,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user and revoke active tokens
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findByPk(userId);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
    }
    // Clear the HttpOnly session cookie
    res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ message: 'Logged out successfully, server session revoked' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, updateCredentials, logout };

