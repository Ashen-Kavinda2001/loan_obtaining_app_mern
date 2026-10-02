/**
 * Adds any missing columns and indexes (db/schema.js). The server does NOT do this at
 * boot: run it by hand with `npm run migrate` (cPanel terminal) after deploying a model change.
 */
const { run } = require('./bootstrap');

run(async () => {}); // bootstrap already ran ensureSchema and logged the result
