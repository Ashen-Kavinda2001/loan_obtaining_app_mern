/**
 * Debug script — checks what admin users exist and tests password matching.
 */
require('dotenv').config();
const { sequelize, User } = require('./models');

(async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ FATAL: debug_login.js cannot be run in production environments.');
    process.exit(1);
  }

  await sequelize.authenticate();
  await sequelize.sync();

  // 1. List all users
  const users = await User.findAll({ attributes: ['id', 'email', 'role', 'createdAt'] });
  console.log(`\n📋 Total users in DB: ${users.length}`);
  users.forEach((u, i) => {
    console.log(`  [${i}] email: "${u.email}"  role: ${u.role} (Hash redacted)`);
  });

  if (users.length === 0) {
    console.log('\n❌ No users found! The admin was never created.');
    console.log('   Fix: ensure init.js runs on startup or run reset_admin.js with env vars.\n');
    process.exit(0);
  }

  console.log('\n--- Done ---');
  process.exit(0);
})();

