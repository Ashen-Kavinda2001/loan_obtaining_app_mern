/**
 * init.js — Production first-run initializer.
 *
 * Creates the initial admin user from environment variables ONLY if
 * no admin user exists yet in the database. No demo data is inserted.
 *
 * ── Standard Behaviour (RESET_ADMIN_ON_BOOT=false) ──────────────────────────
 *   • If no admin exists  → creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD.
 *   • If admin exists     → does nothing. The database is the single source of truth.
 *     The client can freely change their email/password via the web app and it
 *     will persist across all devices and server restarts.
 *
 * ── Emergency Reset (RESET_ADMIN_ON_BOOT=true) ──────────────────────────────
 *   • Forces admin credentials back to ADMIN_EMAIL / ADMIN_PASSWORD from .env.
 *   • Use ONLY when the client is completely locked out and the OTP email is not working.
 *   • Set back to false immediately after one successful restart.
 *
 * Called automatically by the server on startup (see index.js).
 * Environment variables required:
 *   ADMIN_EMAIL           — e.g. owner@yourbusiness.com
 *   ADMIN_PASSWORD        — e.g. a strong password (min 8 chars)
 *   RESET_ADMIN_ON_BOOT   — true | false  (default: false)
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

    // Check if any admin account already exists in the database
    let admin = await User.findOne({ where: { email: normalizedEmail } });
    if (!admin) {
      admin = await User.findOne({ where: { role: 'admin' } });
      if (admin && admin.email !== normalizedEmail) {
        console.log(`ℹ️ Updating admin email from "${admin.email}" to "${normalizedEmail}"`);
        admin.email = normalizedEmail;
        await admin.save();
      }
    }

    if (!admin) {
      // ── Fresh install: no admin exists yet — seed from .env ─────────────────
      await User.create({ email: normalizedEmail, password, role: 'admin' });
      console.log(`✅ First admin user created: ${normalizedEmail}`);
    } else {
      // ── Admin already exists in database ────────────────────────────────────
      if (process.env.RESET_ADMIN_ON_BOOT === 'true') {
        // Emergency override: force credentials back to .env values
        admin.email         = normalizedEmail;
        admin.password      = password; // User beforeSave will hash safely without double-hash
        admin.tokenVersion  = (admin.tokenVersion || 0) + 1; // revoke all active sessions
        await admin.save();
        console.log(`🔄 Admin credentials force-reset from .env for: ${normalizedEmail}`);
        console.warn('⚠️  RESET_ADMIN_ON_BOOT is true — set it back to false in .env immediately!');
      } else {
        // Standard behaviour: database credentials are authoritative — do not touch
        console.log(`ℹ️  Admin already exists (${admin.email}). Database credentials unchanged.`);
      }
    }
  } catch (err) {
    console.error('❌ Initialization error:', err.message);
  }
};

module.exports = initializeApp;

