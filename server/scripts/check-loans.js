/**
 * Loan health check (PROJECT_REVIEW.md §5.5). Read-only unless --fix is given.
 *
 *   npm run check-loans                    list every loan that needs a correction, and what would change
 *   npm run check-loans -- --loan=12       the same for one loan only
 *   npm run check-loans -- --fix           apply the corrections (add --loan=12 to fix one loan only)
 *
 * The truth for each loan is the cash on its recorded payments (services/loanMath.planRepair):
 *   paid so far = that cash, balance = loan total − paid so far,
 * and the open weeks are made to add up to the balance. Older code (and the Phase 1 rollback) could
 * leave a balance above the open weeks, a week marked paid by a payment that was later reverted,
 * or a shortfall that was never added to a later week. Payments never move such a difference onto
 * a week by themselves any more; the loan page shows a warning until this script corrects it.
 */
const { run } = require('./bootstrap');

const FIX = process.argv.includes('--fix');
const loanArg = process.argv.find((a) => a.startsWith('--loan='));
const ONLY_LOAN = loanArg ? Number(loanArg.split('=')[1]) : null;

run(async () => {
  const { Op } = require('sequelize');
  const { sequelize, Loan, Payment } = require('../models');
  const { planRepair } = require('../services/loanMath');
  const { todayLocal } = require('../utils/dates');
  const today = todayLocal();

  const loans = await Loan.findAll({ where: ONLY_LOAN ? { id: ONLY_LOAN } : {}, order: [['id', 'ASC']], attributes: ['id'] });
  if (ONLY_LOAN && loans.length === 0) throw new Error(`Loan ${ONLY_LOAN} not found (or deleted)`);

  let needRepair = 0;
  let repaired = 0;

  for (const { id: loanId } of loans) {
    // With --fix: same locking order as paymentController, so a payment made meanwhile is never
    // overwritten. A report-only run takes no locks, so it can never hold up the live system.
    await sequelize.transaction(async (t) => {
      const lock = FIX ? t.LOCK.UPDATE : undefined;
      const loan = await Loan.findByPk(loanId, { transaction: t, lock });
      const rows = await Payment.findAll({ where: { loanId }, order: [['monthNumber', 'ASC']], transaction: t, lock });
      if (rows.length === 0) {
        console.log(`Loan ${loanId}: has no installments — review by hand`);
        needRepair++;
        return;
      }

      const plan = planRepair({ loan: loan.get({ plain: true }), rows: rows.map((r) => r.get({ plain: true })), today });
      const statusChanged = plan.loan.status !== loan.status;
      if (plan.notes.length === 0 && !statusChanged) return;
      needRepair++;

      console.log(`\nLoan ${loanId} (member ${loan.memberId}, total Rs. ${Number(loan.totalRepayable).toLocaleString('en-US')}):`);
      for (const note of plan.notes) console.log(`  - ${note}`);
      if (statusChanged) console.log(`  - status ${loan.status} → ${plan.loan.status}`);
      if (!FIX) return;

      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const { id, set } of plan.changes) await byId.get(id).update(set, { transaction: t });
      if (plan.create) await Payment.create({ loanId, ...plan.create }, { transaction: t });
      await loan.update(plan.loan, { transaction: t });
      console.log('  ✓ corrected');
      repaired++;
    });
  }

  const pastDue = await Payment.count({ // deleted loans are not checked
    where: { status: 'pending', dueDate: { [Op.lt]: today }, loanId: loans.map((l) => l.id) },
  });
  if (pastDue) console.log(`\n${pastDue} past-due installments not yet flagged overdue (run: npm run sync-overdue)`);

  console.log(`\nChecked ${loans.length} loan(s): ${needRepair} need a correction.` +
    (FIX ? ` Corrected ${repaired}.` : needRepair ? ' Nothing was changed. Run again with --fix to apply.' : ''));
});
