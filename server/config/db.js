const { Sequelize } = require('sequelize');

const rawUri = process.env.MYSQL_URI || 'mysql://root:password@localhost:3306/loan_app';
// Strip ?ssl-mode=REQUIRED as mysql2 uses dialectOptions.ssl directly
const connectionUri = rawUri.replace(/\?.*$/i, '');

// Detect local database connections (cPanel localhost MySQL does not use SSL)
const isLocalDB = connectionUri.includes('localhost') || connectionUri.includes('127.0.0.1');

const sequelize = new Sequelize(connectionUri, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: isLocalDB
    ? {} // No SSL needed for cPanel local MySQL
    : {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Accepts Aiven Cloud SSL certificate
        },
      },
  pool: {
    max: 5,   // Conservative limit for shared hosting (cPanel MySQL connection limits)
    min: 0,   // Do not hold idle connections open — prevents stale socket dropouts after hours of inactivity
    acquire: 30000,
    idle: 10000,
    evict: 10000, // Periodically cleans up dead connections
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
