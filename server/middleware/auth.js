const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const candidates = [];

  // 1. Bearer header (most authoritative — explicitly sent by frontend from localStorage)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.split(' ')[1];
    if (bearer && bearer !== 'null' && bearer !== 'undefined') {
      candidates.push(bearer);
    }
  }

  // 2. HttpOnly cookie (fallback for browser clients)
  if (req.cookies?.token) {
    candidates.push(req.cookies.token);
  }

  if (candidates.length === 0) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  for (const token of candidates) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      const user = await User.findByPk(decoded.id);

      if (!user) continue;

      // Verify token version (revokes token if password/credentials changed)
      if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
        continue;
      }

      req.user = user;
      return next();
    } catch {
      // Try next candidate if verification fails
    }
  }

  return res.status(401).json({ message: 'Not authorized, session invalid or expired' });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

module.exports = { protect, authorize };