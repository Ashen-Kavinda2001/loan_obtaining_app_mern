/**
 * Schema migrations without extra packages (the deploy does not run `npm install` on the server).
 *
 * Each file in server/migrations/ is `NNN-description.js` exporting `async up({ qi, sequelize, DataTypes })`.
 * Applied names are recorded in the SchemaMigrations table, so each one runs once, in file-name order.
 * Write every migration so it is safe to run again (check before adding), because a run can stop halfway.
 *
 * Migrations run only from the command line (`npm run migrate`, and before every scripts/ job),
 * never when the web server starts, so a restart can never be held up by a schema change.
 */
const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DIR = path.join(__dirname, '..', 'migrations');
const TABLE = 'SchemaMigrations';

const ensureTable = () => sequelize.query(
  `CREATE TABLE IF NOT EXISTS ${TABLE} (name VARCHAR(255) NOT NULL PRIMARY KEY, appliedAt DATETIME NOT NULL)`,
);

const migrationFiles = () => fs.readdirSync(DIR).filter((f) => /^\d{3}-.+\.js$/.test(f)).sort();

// Applies every pending migration. Returns true on success; on failure logs what to do and returns false.
const migrate = async () => {
  try {
    await ensureTable();
    const [rows] = await sequelize.query(`SELECT name FROM ${TABLE}`);
    const applied = new Set(rows.map((r) => r.name));
    const pending = migrationFiles().filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('✅ Database up to date.');
      return true;
    }
    const qi = sequelize.getQueryInterface();
    for (const file of pending) {
      console.log(`▶ Migration ${file}`);
      await require(path.join(DIR, file)).up({ qi, sequelize, DataTypes });
      await sequelize.query(`INSERT INTO ${TABLE} (name, appliedAt) VALUES (?, NOW())`, { replacements: [file] });
    }
    console.log(`✅ Applied ${pending.length} migration(s).`);
    return true;
  } catch (err) {
    console.error(`❌ Migration failed: ${err.message}. Fix the cause and run "npm run migrate" again (it resumes where it stopped).`);
    return false;
  }
};

// Whether a table exists (for migrations that create tables)
const tableExists = async (qi, table) => {
  try {
    await qi.describeTable(table);
    return true;
  } catch {
    return false;
  }
};

module.exports = { migrate, tableExists };
