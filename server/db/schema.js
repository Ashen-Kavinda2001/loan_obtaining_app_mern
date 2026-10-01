/**
 * Adds the columns and indexes that models gained after the production tables were created.
 *
 * sequelize.sync() only creates missing tables; it never alters existing ones. This runs on every
 * boot (and via `npm run migrate`), checks what is missing, and adds only that, so it is safe to
 * repeat. Two processes booting together may race; a "duplicate column/key" error from the loser
 * is ignored. The same changes are in db/phase1.sql for running by hand in phpMyAdmin.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const COLUMNS = {
  Payments: {
    recordedBy:     { type: DataTypes.INTEGER, allowNull: true },
    reversedBy:     { type: DataTypes.INTEGER, allowNull: true },
    reversedAt:     { type: DataTypes.DATE, allowNull: true },
    idempotencyKey: { type: DataTypes.STRING(64), allowNull: true },
    cascadeLog:     { type: DataTypes.TEXT('medium'), allowNull: true },
  },
  Loans: {
    deletedAt:    { type: DataTypes.DATE, allowNull: true },
    deletedBy:    { type: DataTypes.INTEGER, allowNull: true },
    deleteReason: { type: DataTypes.STRING(255), allowNull: true },
  },
};

const INDEXES = [
  { table: 'Payments', name: 'payments_idempotency_key', fields: ['idempotencyKey'], unique: true },
];

const ER_DUP_FIELDNAME = 1060;
const ER_DUP_KEYNAME   = 1061;
const isDuplicate = (err) => [ER_DUP_FIELDNAME, ER_DUP_KEYNAME].includes(err.original?.errno ?? err.parent?.errno);

const ensureSchema = async () => {
  const qi = sequelize.getQueryInterface();
  const added = [];
  try {
    for (const [table, columns] of Object.entries(COLUMNS)) {
      const existing = await qi.describeTable(table);
      for (const [name, definition] of Object.entries(columns)) {
        if (existing[name]) continue;
        try {
          await qi.addColumn(table, name, definition);
          added.push(`${table}.${name}`);
        } catch (err) {
          if (!isDuplicate(err)) throw err;
        }
      }
    }
    for (const { table, name, fields, unique } of INDEXES) {
      const indexes = await qi.showIndex(table);
      if (indexes.some((i) => i.name === name)) continue;
      try {
        await qi.addIndex(table, fields, { name, unique });
        added.push(`index ${name}`);
      } catch (err) {
        if (!isDuplicate(err)) throw err;
      }
    }
    console.log(added.length ? `✅ Schema updated: ${added.join(', ')}` : '✅ Schema up to date.');
    return true;
  } catch (err) {
    // Requests touching these columns will fail until this succeeds, so say exactly what to do
    console.error(`❌ Schema update failed: ${err.message}. Run "npm run migrate" in /backend, or db/phase1.sql in phpMyAdmin.`);
    return false;
  }
};

module.exports = { ensureSchema };
