
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();

// ── Cryptographic Pre-flight Checks ──────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('⛔ FATAL: JWT_SECRET must be configured with at least 32 characters (256 bits) of entropy.');
  process.exit(1);
}

if (!process.env.MYSQL_URI) {
  console.error('⛔ FATAL: MYSQL_URI must be configured in environment variables.');
  process.exit(1);
}

const express       = require('express');
const cors          = require('cors');
const { connectDB } = require('./config/db');
require('./models'); // Loads models and associations
const initializeApp = require('./init');

// Connect to MySQL, then run first-time admin setup if needed
connectDB()
  .then(() => initializeApp());

const app = express();

// ── Reverse Proxy Trust ─────────────────────────────────────────────────────
// Enable trust proxy for cPanel / Apache / LiteSpeed reverse proxy so client IPs are accurate
app.set('trust proxy', 1);

// ── Security Headers & Hardening ──────────────────────────
const helmet        = require('helmet');
const cookieParser  = require('cookie-parser');
const corsOptions   = require('./config/corsOptions');

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
  })
);

app.use(cors(corsOptions));

// In-memory diagnostic ring buffer for live operational telemetry (last 50 requests)
const recentApiLogs = [];
const logApiEvent = (item) => {
  recentApiLogs.push({ ...item, timestamp: new Date().toISOString() });
  if (recentApiLogs.length > 50) recentApiLogs.shift();
};

app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    if (req.url && !req.url.includes('/debug-logs') && !req.url.includes('/health')) {
      logApiEvent({
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        duration: `${Date.now() - start}ms`,
        origin: req.headers.origin || null,
        hasAuth: Boolean(req.headers.authorization),
        hasCookie: Boolean(req.cookies?.token),
        error: res.locals.lastError || null,
      });
    }
    return originalEnd.apply(this, args);
  };
  next();
});

// Disable etag generation on dynamic APIs to prevent 304 empty body responses on mobile PWAs
app.set('etag', false);

// Keep connections alive and ensure real-time financial responses are never cached
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const { globalLimiter } = require('./middleware/rateLimiters');
app.use(globalLimiter);

app.use(cookieParser());

// Body parser with size limits to protect against memory exhaustion DoS
app.use(express.json({ limit: '10kb' }));

// ── Routes ────────────────────────────────────────────────
const apiRouter = express.Router();
apiRouter.use('/auth',     require('./routes/auth'));
apiRouter.use('/members',  require('./routes/members'));
apiRouter.use('/groups',   require('./routes/groups'));
apiRouter.use('/loans',    require('./routes/loans'));
apiRouter.use('/payments', require('./routes/payments'));
// DB-free health check — answers instantly even when DB pool is saturated
apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));
// Ping — even lighter than health, used for A/B diagnosis: does it respond while a DB route stalls?
apiRouter.get('/ping',   (req, res) => res.json({ pong: true, ts: Date.now() }));
apiRouter.get('/debug-logs', (req, res) => res.json({ logs: recentApiLogs.slice().reverse() }));

// Support both /api/... and /... (prevents 404s regardless of cPanel Passenger baseURI mapping)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  res.locals.lastError = err.message;
  // Timestamp + method + path in every error log for easy correlation with LiteSpeed access logs
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.name}: ${err.message}`);
  if (res.headersSent) return next(err);

  const isProduction = process.env.NODE_ENV === 'production';

  // Map Sequelize connection errors to 503 so client gets a fast error instead of a 30s timeout
  let statusCode = err.status || 500;
  if (err.name === 'SequelizeConnectionAcquireTimeoutError' ||
      err.name === 'SequelizeConnectionError' ||
      err.name === 'SequelizeConnectionRefusedError' ||
      err.name === 'SequelizeConnectionTimedOutError') {
    statusCode = 503;
  } else if (err.name === 'SequelizeValidationError' ||
             err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 422;
  } else if (err.message && err.message.startsWith('CORS blocked')) {
    statusCode = 403;
  }

  res.status(statusCode).json({
    error: err.name || 'ServerError',
    message: isProduction && statusCode === 500
      ? 'An unexpected server error occurred'
      : (err.message || 'Server error'),
  });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// KeepAlive timeouts aligned with LiteSpeed / Passenger reverse proxy (prevents 408 race conditions)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
