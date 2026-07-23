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

const User = require('./models/User');

const initializeApp = async () => {
  try {
    // Check if any admin user already exists
    const adminExists = await User.findOne({});
    if (adminExists) {
      console.log('ℹ️  Admin already exists. Skipping initialization.');
      return;
    }

    // Read credentials from environment variables
    const email    = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn(
        '⚠️  WARNING: No admin user found, but ADMIN_EMAIL / ADMIN_PASSWORD ' +
        'are not set in .env. Skipping auto-initialization.\n' +
        '   Set these variables and restart the server to create the first admin.'
      );
      return;
    }

    if (password.length < 8) {
      console.warn('⚠️  ADMIN_PASSWORD must be at least 8 characters. Skipping.');
      return;
    }

    await User.create({ email, password });
    console.log(`✅ First admin user created: ${email}`);
    console.log('   ⚠️  Please change your password after first login!');
  } catch (err) {
    console.error('❌ Initialization error:', err.message);
  }
};

module.exports = initializeApp;
