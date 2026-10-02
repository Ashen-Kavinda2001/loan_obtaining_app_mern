// Phase 1 columns and the idempotency index (db/schema.js). Already present in production, where
// this only checks and records itself as applied.
const { ensureSchema } = require('../db/schema');

module.exports.up = async () => {
  if (!(await ensureSchema())) throw new Error('Phase 1 columns could not be added (see above)');
};
