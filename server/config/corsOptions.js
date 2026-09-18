/**
 * Production-ready CORS configuration.
 *
 * Supports comma-separated origins from CORS_ORIGIN,
 * explicit methods, explicit allowed headers, and 24h preflight caching.
 */

const rawOrigins = process.env.CORS_ORIGIN || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// In development, default to local Vite dev server if CORS_ORIGIN is unset
if (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173');
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile clients, Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = corsOptions;
