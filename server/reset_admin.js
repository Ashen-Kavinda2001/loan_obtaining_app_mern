/**
 * Reset admin — drops old admin users, creates one from .env credentials.
 */
require('dotenv').config();
const { sequelize, User } = require('./models');

(async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ FATAL: reset_admin.js cannot be run in production environments.');
    process.exit(1);
  }

  await sequelize.authenticate();
  await sequelize.sync();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  console.log(`\nCreating admin: ${email}`);

  // Remove old admin(s)
  await User.destroy({ where: {}, force: true });
  console.log('🗑️  Cleared all users');

  // Create fresh admin from .env
  await User.create({ email, password });
  console.log(`✅ Admin created successfully for: ${email}`);

  // Verify it works
  const user = await User.findOne({ where: { email } });
  const match = await user.matchPassword(password);
  console.log(`🔑 Password verification: ${match ? '✅ MATCH (Verification successful)' : '❌ FAIL'}`);

  console.log('\n--- Done. Restart your server and try logging in. ---');
  process.exit(0);
})();

