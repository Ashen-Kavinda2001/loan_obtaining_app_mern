
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
const { connectDB, sequelize } = require('./config/db');
require('./models'); // Loads models and associations
const initializeApp = require('./init');

// Connect to Aiven MySQL, sync schema, then run first-time setup if needed
connectDB()
  .then(() => sequelize.sync())
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
app.use(helmet());

app.use(cors(corsOptions));

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
apiRouter.get('/health',   (req, res) => res.json({ status: 'ok' }));

// Support both /api/... and /... (prevents 404s regardless of cPanel Passenger baseURI mapping)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.status || (err.message && err.message.startsWith('CORS blocked') ? 403 : 500);
  res.status(statusCode).json({
    message: isProduction && statusCode === 500 ? 'An unexpected server error occurred' : (err.message || 'Server error'),
  });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// KeepAlive timeouts aligned with LiteSpeed / Passenger reverse proxy (prevents 408 race conditions)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
