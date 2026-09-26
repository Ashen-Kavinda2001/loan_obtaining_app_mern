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
    max: 15,
    min: 0,       // CRITICAL: NEVER hold idle connections. Localhost MySQL establishes in 2ms.
    acquire: 15000,
    idle: 5000,   // Release idle connections after 5s so they never turn into stale zombies
    evict: 2000,  // Clean up reaped connections every 2s
  },
  retry: {
    max: 3,       // Retry transient socket drops — but ONLY on real connection errors (not query logic errors)
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /ConnectionTimedOutError/,
      /TimeoutError/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /PROTOCOL_CONNECTION_LOST/,
    ],
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ MySQL Database connected successfully${isLocalDB ? ' (local)' : ' via SSL'}.`);
  } catch (error) {
    console.error(`❌ MySQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
