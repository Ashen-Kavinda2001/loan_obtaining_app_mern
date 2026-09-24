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
      }
    : {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Accepts Aiven Cloud SSL certificate
        },
        connectTimeout: 10000,
      },
  pool: {
    max: 20,      // Scale connection capacity for simultaneous queries & multiple devices
    min: 0,       // Do not hold idle connections open — prevents stale socket dropouts
    acquire: 60000,
    idle: 60000,
    evict: 15000, // Periodically cleans up dead connections
  },
  retry: {
    max: 3,   // Automatically retry transient connection dropouts
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
