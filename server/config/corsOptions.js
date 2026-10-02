/**
 * CORS allow-list (S4).
 *
 * The production frontend calls /api on its own origin, so it needs no CORS at all. This list only
 * decides which OTHER sites a browser lets read API responses with credentials. Any origin not
 * listed gets no CORS headers, and the browser blocks its scripts from reading responses.
 *
 * Always allowed: https://fgiloans.lk and https://www.fgiloans.lk.
 * Extra origins: CORS_ORIGIN in .env, comma-separated.
 * Outside production, the Vite dev and preview servers on localhost are allowed too.
 * Requests without an Origin header (same-origin GETs, curl, uptime monitors) are unaffected.
 */

const PRODUCTION_ORIGINS = ['https://fgiloans.lk', 'https://www.fgiloans.lk'];
const DEV_ORIGINS = [
  'http://localhost:5173', 'http://127.0.0.1:5173', // vite dev
  'http://localhost:4173', 'http://127.0.0.1:4173', // vite preview
];

const allowedOrigins = new Set([
  ...PRODUCTION_ORIGINS,
  ...(process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
  ...(process.env.NODE_ENV === 'production' ? [] : DEV_ORIGINS),
]);

const corsOptions = {
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = corsOptions;
