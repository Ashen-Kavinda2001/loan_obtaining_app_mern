// Shared setup for command-line scripts: load server/.env whatever the working directory
// (cron jobs often start elsewhere), set the app timezone, then run `main` with a DB connection.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('../config/timezone');

const run = (main) => {
  const { sequelize } = require('../models');
  const { ensureSchema } = require('../db/schema');
  (async () => {
    try {
      await sequelize.authenticate();
      if (!(await ensureSchema())) throw new Error('Stopped: the schema update failed (see above)');
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
