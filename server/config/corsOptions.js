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

// Always allow production domain variants, temp IP (during DNS propagation), and local dev
const defaultOrigins = [
  'https://fgiloans.lk',
  'http://fgiloans.lk',
  'https://www.fgiloans.lk',
  'http://www.fgiloans.lk',
  // ZirconHost temporary URL — active during DNS propagation (up to 48h after domain setup)
  'http://49.12.121.200',
  'http://localhost:5173',
  'http://localhost:5000',
];

defaultOrigins.forEach((orig) => {
  if (!allowedOrigins.includes(orig)) {
    allowedOrigins.push(orig);
  }
});

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
