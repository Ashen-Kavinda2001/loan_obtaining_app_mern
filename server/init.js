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

/**
 * Ensures an admin user exists in the database.
 * If missing, creates it. If present and forceReset is true, resets credentials.
 */
const ensureAdminUser = async (email, password, label = 'Admin', forceReset = false) => {
  if (!email || !password) {
    return;
  }
  if (password.length < 8) {
    console.warn(`⚠️  ${label} password must be at least 8 characters. Skipping.`);
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user) {
    await User.create({ email: normalizedEmail, password, role: 'admin' });
    console.log(`✅ ${label} account created: ${normalizedEmail}`);
  } else {
    if (forceReset) {
      user.password = password; // beforeSave hook will hash safely without double-hash
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      console.log(`🔄 ${label} credentials force-reset from .env for: ${normalizedEmail}`);
    } else {
      console.log(`ℹ️  ${label} exists (${normalizedEmail}). Credentials authoritative.`);
    }
  }
};

const initializeApp = async () => {
  try {
    const isResetBoot = process.env.RESET_ADMIN_ON_BOOT === 'true';

    // ── 1. Client Admin (Primary) ───────────────────────────────────────────
    const clientEmail = process.env.ADMIN_EMAIL || 'ashenkavinda.dev@gmail.com';
    const clientPassword = process.env.ADMIN_PASSWORD || 'Nalin@123';
    await ensureAdminUser(clientEmail, clientPassword, 'Client Admin', isResetBoot);

    // ── 2. Developer Admin (Support & Maintenance) ───────────────────────────
    const devEmail = process.env.DEV_ADMIN_EMAIL || 'kavi2shen@gmail.com';
    const devPassword = process.env.DEV_ADMIN_PASSWORD || 'Ashen@123';
    await ensureAdminUser(devEmail, devPassword, 'Developer Admin', isResetBoot);

    if (isResetBoot) {
      console.warn('⚠️  RESET_ADMIN_ON_BOOT is true — set it back to false in .env immediately!');
    }
  } catch (err) {
    console.error('❌ Initialization error:', err.message);
  }
};

module.exports = initializeApp;

