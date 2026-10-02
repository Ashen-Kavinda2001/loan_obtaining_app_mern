/**
 * Applies pending schema migrations (server/migrations/, see db/migrator.js).
 * The server does NOT do this at boot: run `npm run migrate` (cPanel terminal) after deploying a
 * change that adds a migration. Every other script in this folder also applies them first.
 */
const { run } = require('./bootstrap');

run(async () => {}); // bootstrap already applied the migrations and logged the result
