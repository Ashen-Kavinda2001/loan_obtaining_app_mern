/**
 * Daily overdue sync (B13). Flags past-due installments and loans as overdue and clears stale flags.
 *
 * cPanel → Cron Jobs, once a day just after midnight (e.g. "5 0 * * *"). Copy the "source …/activate"
 * part from the command shown at the top of cPanel → Setup Node.js App:
 *   source /home/<user>/nodevenv/backend/<version>/bin/activate && node /home/<user>/backend/scripts/sync-overdue.js
 *
 * The cron schedule uses the server clock; "today" is always the Sri Lankan date (config/timezone.js).
 */
const { run } = require('./bootstrap');

run(async () => {
  const { syncOverdueStatus } = require('../services/overdueService');
  const r = await syncOverdueStatus();
  console.log(`[${new Date().toISOString()}] overdue sync for ${r.today}: ` +
    `installments +${r.installmentsFlagged}/-${r.installmentsCleared}, loans +${r.loansFlagged}/-${r.loansCleared}`);
});
