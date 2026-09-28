const { Sequelize } = require('sequelize');

const rawUri = process.env.MYSQL_URI || 'mysql://root:password@127.0.0.1:3306/loan_app';
// Strip ?ssl-mode=REQUIRED and enforce direct IPv4 127.0.0.1 for localhost (eliminates Node 18 IPv6 delay)
const connectionUri = rawUri
  .replace(/\?.*$/i, '')
  .replace(/@localhost(:|\/)/i, '@127.0.0.1$1');

// Detect local database connections (cPanel local MySQL does not use SSL)
const isLocalDB = connectionUri.includes('localhost') || connectionUri.includes('127.0.0.1');

const sequelize = new Sequelize(connectionUri, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: isLocalDB
    ? {
        connectTimeout: 10000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 5000,
      }
    : {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Accepts Aiven Cloud SSL certificate
        },
        connectTimeout: 20000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 5000,
      },
  pool: {
    max: 5,         // Safe pool size for 1GB RAM cPanel shared hosting (prevents memory spikes & max_user_connections exhaustion)
    min: 2,         // Keep 2 warm connections always ready — eliminates cold connect latency between human clicks!
    acquire: 10000, // Fail fast with a 503 well inside the client's 45s axios timeout
    idle: 30000,    // Keep warm connection for 30s instead of killing at 5s while user types or reads the screen
    evict: 5000,    // Clean up reaped connections every 5s
  },
  // No automatic query retries. Sequelize runs pool acquisition INSIDE the retry loop, so the old
  // /TimeoutError/ pattern matched SequelizeConnectionAcquireTimeoutError and turned one 15s acquire
  // timeout into 3 × 15s = 45s — exactly the client's axios timeout, hiding the 503 entirely.
  // Retrying on ECONNRESET etc. can also re-execute INSERT/UPDATE statements (double writes).
  retry: { max: 1 },
});

// Bound every lock wait so one blocked statement can't hold a pooled connection for 50s+
// (InnoDB default) or indefinitely (metadata locks default to 1 year). Each SET is independent
// because MySQL and MariaDB support different variables — an unknown one is logged, not fatal.
const SESSION_SETTINGS = [
  'SET SESSION innodb_lock_wait_timeout = 10',
  'SET SESSION lock_wait_timeout = 10',
];
sequelize.addHook('afterConnect', async (connection) => {
  for (const sql of SESSION_SETTINGS) {
    await new Promise((resolve) => {
      connection.query(sql, (err) => {
        if (err) console.warn(`⚠️  ${sql} failed: ${err.message}`);
        resolve();
      });
    });
  }
});

// DB-free pool snapshot for diagnostics: using === max && waiting > 0 means the pool is exhausted
const getPoolStats = () => {
  const pool = sequelize.connectionManager.pool;
  if (!pool || typeof pool.using !== 'number') return null;
  return { size: pool.size, available: pool.available, using: pool.using, waiting: pool.waiting, max: pool.maxSize };
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ MySQL Database connected successfully${isLocalDB ? ' (local)' : ' via SSL'}.`);
  } catch (error) {
    console.error(`❌ MySQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB, getPoolStats };
