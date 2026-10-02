// Shared setup for command-line scripts: load server/.env whatever the working directory
// (cron jobs often start elsewhere), set the app timezone, apply any pending migrations
// (db/migrator.js), then run `main` with a DB connection.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('../config/timezone');

const run = (main) => {
  const { sequelize } = require('../models');
  const { migrate } = require('../db/migrator');
  (async () => {
    try {
      await sequelize.authenticate();
      if (!(await migrate())) throw new Error('Stopped: a migration failed (see above)');
      await main();
    } catch (err) {
      console.error(`❌ ${err.message}`);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  })();
};

module.exports = { run };
