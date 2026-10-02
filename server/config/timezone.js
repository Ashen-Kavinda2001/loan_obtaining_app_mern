/**
 * Business dates (due dates, "today", month and week boundaries) are Sri Lankan local dates.
 *
 * Require this right after dotenv and before anything creates a Date. Node applies a runtime
 * change to process.env.TZ immediately. Sequelize formats DATEONLY values in the process timezone,
 * so without this a server west of UTC would store every due date one day early.
 * DATETIME columns are unaffected: Sequelize still stores them in UTC.
 *
 * Set TZ in .env (or the cPanel Node.js app environment) only to override the default.
 */
process.env.TZ = process.env.TZ || 'Asia/Colombo';

module.exports = { APP_TZ: process.env.TZ };
