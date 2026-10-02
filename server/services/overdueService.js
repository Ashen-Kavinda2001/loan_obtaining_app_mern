/**
 * Persists overdue flags for installments and loans.
 *
 * Screens never depend on this: the API derives overdue from the due date at read time
 * (loanMath.displayStatus / deriveLoanStatus). This keeps the stored status columns accurate for
 * reports and direct SQL. It runs once at server start and daily from cron
 * (scripts/sync-overdue.js).
 *
 * "today" comes from Node (app timezone), not MySQL CURDATE(): Sequelize sets each connection's
 * time_zone to UTC, so CURDATE() would be a day behind for the first 5.5 hours of every Sri Lankan day.
 */
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { todayLocal } = require('../utils/dates');

const PAST_DUE_EXISTS = `
  EXISTS (SELECT 1 FROM Payments p
          WHERE p.loanId = l.id AND p.status IN ('pending', 'overdue') AND p.dueDate < :today)`;

const syncOverdueStatus = async ({ today = todayLocal() } = {}) => {
  const run = async (sql) => {
    const [, affected] = await sequelize.query(sql, { replacements: { today }, type: QueryTypes.UPDATE });
    return affected;
  };

  const result = {
    today,
    installmentsFlagged: await run(`
      UPDATE Payments p JOIN Loans l ON l.id = p.loanId
      SET p.status = 'overdue'
      WHERE l.deletedAt IS NULL AND p.status = 'pending' AND p.dueDate < :today`),
    // e.g. a reverted payment restored with a stale flag, or a corrected due date
    installmentsCleared: await run(`
      UPDATE Payments SET status = 'pending'
      WHERE status = 'overdue' AND dueDate >= :today`),
    loansFlagged: await run(`
      UPDATE Loans l SET l.status = 'overdue'
      WHERE l.deletedAt IS NULL AND l.status = 'active' AND ${PAST_DUE_EXISTS}`),
    loansCleared: await run(`
      UPDATE Loans l SET l.status = 'active'
      WHERE l.deletedAt IS NULL AND l.status = 'overdue' AND NOT ${PAST_DUE_EXISTS}`),
  };
  return result;
};

module.exports = { syncOverdueStatus };
