/**
 * emergency_reset.js
 *
 * Resets the admin user credentials directly from .env values.
 * Works in ALL environments including production.
 *
 * Run ONCE from cPanel Terminal:
 *   node emergency_reset.js
 *
 * After running:
 *   1. Restart the Node.js app in cPanel
 *   2. Login with ADMIN_EMAIL / ADMIN_PASSWORD from .env
 *   3. Optionally change your password from Account Settings
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');

const email    = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('❌ ADMIN_EMAIL or ADMIN_PASSWORD not set in .env');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ ADMIN_PASSWORD must be at least 8 characters');
  process.exit(1);
}

(async () => {
  try {
    const { sequelize, User } = require('./models');

    console.log('\n🔌 Connecting to database...');
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('✅ Database connected.');

    const normalizedEmail = email.toLowerCase().trim();

    // Hash password manually (bypasses any hook issues)
    const hashed = await bcrypt.hash(password, 10);

    // Find existing admin
    let admin = await User.findOne({ where: { email: normalizedEmail } });
    if (!admin) {
      admin = await User.findOne({ where: { role: 'admin' } });
    }

    if (admin) {
      // Update existing admin directly (raw update to bypass beforeSave double-hash)
      await User.update(
        {
          email:        normalizedEmail,
          password:     hashed,
          tokenVersion: (admin.tokenVersion || 0) + 1,
        },
        { where: { id: admin.id }, individualHooks: false }
      );
      console.log(`✅ Admin credentials reset for: ${normalizedEmail}`);
    } else {
      // No admin exists — create one
      await User.create({ email: normalizedEmail, password, role: 'admin' });
      console.log(`✅ New admin created: ${normalizedEmail}`);
    }

    // Verify the hash works
    const updated = await User.findOne({ where: { email: normalizedEmail } });
    const match   = await bcrypt.compare(password, updated.password);

    console.log(`🔑 Password verification: ${match ? '✅ MATCH — login will work!' : '❌ FAIL — contact developer'}`);
    console.log('\n📌 Next steps:');
    console.log('   1. Restart the Node.js app in cPanel');
    console.log(`   2. Login with: ${normalizedEmail} / ${password}`);
    console.log('   3. Change your password from Account Settings if needed\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
