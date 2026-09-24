const rateLimit = require('express-rate-limit');

// Global baseline rate limiter: 600 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,           // 600 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: 'Too many requests from this IP. Please wait a moment.' },
});

// Throttling for computationally expensive database aggregations (Stats & Dashboards)
const statsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,           // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: 'Dashboard query rate limit exceeded. Please wait a moment.' },
});

// Throttling for operations triggering external billing (SMS dispatches, batch payments)
const financialActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,           // 200 actions per minute
  keyGenerator: (req) => (req.user ? (req.user.id || req.user._id).toString() : req.ip),
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Transaction rate limit reached. Please wait before submitting again.' },
});

// Throttling for group listing to mitigate $O(N)$ table scans
const groupQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,           // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: 'Group request rate limit exceeded. Please wait.' },
});

module.exports = {
  globalLimiter,
  statsLimiter,
  financialActionLimiter,
  groupQueryLimiter,
};
