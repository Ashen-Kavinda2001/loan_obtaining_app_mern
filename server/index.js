
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
const { connectDB, getPoolStats } = require('./config/db');
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

// In-memory diagnostic ring buffer for live operational telemetry (last 50 requests)
const recentApiLogs = [];
const logApiEvent = (item) => {
  recentApiLogs.push({ ...item, timestamp: new Date().toISOString() });
  if (recentApiLogs.length > 50) recentApiLogs.shift();
};

// In-flight request tracker — registered FIRST so it sees requests that stall anywhere in the
// middleware chain (helmet, CORS, body parsing, auth). A request that never responds never reaches
// the completed-request log below, so this is the only way to see it from /debug-logs.
const inFlight = new Map();
let requestSeq = 0;
app.use((req, res, next) => {
  const id = ++requestSeq;
  const entry = { id, method: req.method, url: req.originalUrl || req.url, stage: 'received', startedAt: Date.now() };
  inFlight.set(id, entry);
  req.inFlight = entry;
  res.on('finish', () => inFlight.delete(id));
  // 'close' without 'finish' = the connection dropped before we answered (client/proxy gave up)
  res.on('close', () => {
    if (!inFlight.has(id)) return;
    inFlight.delete(id);
    logApiEvent({
      method: entry.method, url: entry.url, status: 'aborted-before-response',
      stage: entry.stage, duration: `${Date.now() - entry.startedAt}ms`, pid: process.pid,
    });
  });
  next();
});
// Watchdog: write any request stuck > 30s to stderr.log with the stage it stalled in
setInterval(() => {
  for (const e of inFlight.values()) {
    const age = Date.now() - e.startedAt;
    if (age > 30000 && !e.reported) {
      e.reported = true;
      console.error(`[${new Date().toISOString()}] STUCK pid=${process.pid} ${e.method} ${e.url} stage=${e.stage} age=${age}ms pool=${JSON.stringify(getPoolStats())}`);
    }
  }
}, 5000).unref();
const getInFlight = () => Array.from(inFlight.values()).map((e) => ({
  ...e,
  ageMs: Date.now() - e.startedAt,
  startedAt: new Date(e.startedAt).toISOString(),
}));

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
  })
);

app.use(cors(corsOptions));

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
app.use((req, res, next) => {
  if (req.inFlight) req.inFlight.stage = 'body-parsed';
  next();
});

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
// pid + uptime identify WHICH Node process answered — LiteSpeed/Passenger may run several, each with its own pool
const processInfo = () => ({ pid: process.pid, uptimeSec: Math.round(process.uptime()) });
apiRouter.get('/ping',   (req, res) => res.json({ pong: true, ts: Date.now(), ...processInfo(), pool: getPoolStats() }));
apiRouter.get('/debug-logs', (req, res) => res.json({
  ...processInfo(),
  pool: getPoolStats(),
  inFlight: getInFlight().filter((e) => !e.url.includes('/debug-logs')),
  logs: recentApiLogs.slice().reverse(),
}));

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
  if (err.name === 'SequelizeConnectionAcquireTimeoutError') {
    console.error('   DB pool exhausted:', JSON.stringify(getPoolStats()));
  }
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

// keepAliveTimeout must exceed the LiteSpeed/Passenger reverse proxy's upstream idle
// timeout, or Node can close a pooled keep-alive socket while LiteSpeed still considers
// it reusable -- the next request on that socket then gets a connection reset with no
// HTTP response (client sees a network error, not a 502/503).
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
