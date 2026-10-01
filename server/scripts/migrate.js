/**
 * Adds any missing columns and indexes (db/schema.js). The server also does this on every start;
 * run it by hand with `npm run migrate` to see the result directly, e.g. after a failed start.
 */
const { run } = require('./bootstrap');

run(async () => {}); // bootstrap already ran ensureSchema and logged the result
