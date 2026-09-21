/**
 * init.js — Production first-run initializer.
 *
 * Creates the initial admin user from environment variables ONLY if
 * no admin user exists yet. No demo data is inserted.
 *
 * Called automatically by the server on startup (see index.js).
 * Environment variables required:
 *   ADMIN_EMAIL    — e.g.  owner@yourbusiness.com
 *   ADMIN_PASSWORD — e.g.  a strong password (min 8 chars)
 */

const { User } = require('./models');

const initializeApp = async () => {
  try {
    const email    = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not configured in .env');
      return;
    }

    if (password.length < 8) {
      console.warn('⚠️  ADMIN_PASSWORD must be at least 8 characters. Skipping.');
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let admin = await User.findOne({ where: { email: normalizedEmail } });
    if (!admin) {
      admin = await User.findOne({ where: { role: 'admin' } });
    }

    if (!admin) {
      await User.create({ email: normalizedEmail, password, role: 'admin' });
      console.log(`✅ First admin user created: ${normalizedEmail}`);
    } else {
      // Sync admin credentials directly from .env (beforeSave hook will re-hash with bcrypt)
      admin.email = normalizedEmail;
      admin.password = password;
      admin.tokenVersion = (admin.tokenVersion || 0) + 1;
      await admin.save();
      console.log(`✅ Admin credentials synchronized from .env for: ${normalizedEmail}`);
    }
  } catch (err) {
    console.error('❌ Initialization error:', err.message);
  }
};

module.exports = initializeApp;

