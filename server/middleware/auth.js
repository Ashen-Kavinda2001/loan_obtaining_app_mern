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
      if (req.inFlight) req.inFlight.stage = 'auth-db-lookup';
      // Only what handlers need: never load the password hash on every request
      const user = await User.findByPk(decoded.id, { attributes: ['id', 'email', 'role', 'tokenVersion'] });

      if (!user) continue;

      // S2: Reject tokens issued before the last password change / reset.
      // ensureAdminUser and the password-change route both bump tokenVersion.
      // A token without the claim counts as version 0, so it cannot outlive a password change.
      if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        continue; // Token is stale — force re-login
      }

      req.user = user;
      if (req.inFlight) req.inFlight.stage = 'handler';
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