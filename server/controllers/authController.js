const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Generate a signed JWT token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Please provide email and password' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      _id:   user._id,
      email: user.email,
      role:  user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update own email and/or password
// @route   PUT /api/auth/update-credentials
// @access  Private
const updateCredentials = async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;

    if (!currentPassword)
      return res.status(400).json({ message: 'Current password is required' });

    const user = await User.findById(req.user.id);
    if (!user || !(await user.matchPassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    if (newEmail && newEmail !== user.email) {
      const exists = await User.findOne({ email: newEmail.toLowerCase() });
      if (exists) return res.status(400).json({ message: 'That email is already in use' });
      user.email = newEmail.toLowerCase().trim();
    }

    if (newPassword) {
      if (newPassword.length < 6)
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      user.password = newPassword; // pre-save hook will hash it
    }

    await user.save();

    res.json({
      _id:   user._id,
      email: user.email,
      role:  user.role,
      token: generateToken(user._id), // issue a fresh token with new email
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, getMe, updateCredentials };
