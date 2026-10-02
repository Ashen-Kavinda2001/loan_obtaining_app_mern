/**
 * Loan health check (PROJECT_REVIEW.md §5.5). Read-only unless --fix is given.
 *
 *   npm run check-loans             report problems
 *   npm run check-loans -- --fix    also repair the two safe cases below
 *
 * Repaired by --fix:
 *   - A loan with a balance but no open installment gets one more installment for the balance,
 *     due a week after its last one, so the money can be collected. The old "all weeks paid"
 *     rule could mark such loans completed while a partial-payment shortfall was still owed (B3).
 *   - A loan with nothing left to pay that is not marked completed is marked completed.
 * Everything else is reported for a person to decide (for example a balance above the loan total,
 * or open installments on a loan with nothing left to pay).
 * Open installments that do not add up to the balance are corrected by the loan's next payment.
 */
const { run } = require('./bootstrap');

const FIX = process.argv.includes('--fix');
const rs = (cents) => `Rs. ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

run(async () => {
  const { sequelize, Loan, Payment } = require('../models');
  const { toCents, fromCents, isOpen, deriveLoanStatus } = require('../services/loanMath');
  const { todayLocal, addDays } = require('../utils/dates');
  const today = todayLocal();

  const loans = await Loan.findAll({ order: [['id', 'ASC']] });
  const payments = await Payment.findAll({ order: [['monthNumber', 'ASC']], raw: true });
  const rowsByLoan = new Map();
  for (const p of payments) {
    if (!rowsByLoan.has(p.loanId)) rowsByLoan.set(p.loanId, []);
    rowsByLoan.get(p.loanId).push(p);
  }

  const problems = [];
  let repaired = 0;

  for (const loan of loans) {
    const rows = rowsByLoan.get(loan.id) || [];
    const total = toCents(loan.totalRepayable);
    const paid = toCents(loan.paidAmount);
    const remaining = toCents(loan.remainingBalance);
    const open = rows.filter(isOpen);
    const openSum = open.reduce((s, r) => s + toCents(r.amountDue), 0);
    const report = (message) => problems.push(`Loan ${loan.id} (${loan.status}): ${message}`);

    if (remaining > total) report(`balance ${rs(remaining)} is above the loan total ${rs(total)}`);
    if (Math.abs(total - paid - remaining) > 100) {
      report(`paid ${rs(paid)} + balance ${rs(remaining)} differs from the total ${rs(total)}`);
    }
    if (rows.length === 0) {
      report('has no installments');
      continue;
    }

    if (remaining > 0 && open.length === 0) {
      report(`balance ${rs(remaining)} but no open installment${FIX ? ' → added one' : ''}`);
      if (FIX) {
        await sequelize.transaction(async (t) => {
          const last = rows[rows.length - 1];
          const dueDate = addDays(last.dueDate, 7);
          const extra = {
            loanId: loan.id, monthNumber: last.monthNumber + 1, amountDue: fromCents(remaining),
            amountPaid: 0, dueDate, paidAt: null, status: dueDate < today ? 'overdue' : 'pending',
          };
          await Payment.create(extra, { transaction: t });
          await loan.update({
            status: deriveLoanStatus({ remainingBalance: loan.remainingBalance, rows: [...rows, extra], today }),
          }, { transaction: t });
        });
        repaired++;
      }
    } else if (remaining <= 0 && open.length > 0) {
      // Payments are capped at the balance, so these weeks can never be paid: a person must decide
      report(`balance is ${rs(remaining)} but ${open.length} installment(s) totalling ${rs(openSum)} are still open — review by hand`);
    } else if (remaining <= 0 && loan.status !== 'completed') {
      report(`nothing left to pay but not completed${FIX ? ' → marked completed' : ''}`);
      if (FIX) {
        await loan.update({ status: 'completed' });
        repaired++;
      }
    } else if (open.length > 0 && openSum !== remaining) {
      report(`open installments add up to ${rs(openSum)} but the balance is ${rs(remaining)} (corrected at the next payment)`);
    }
  }

  const liveLoanIds = new Set(loans.map((l) => l.id)); // deleted loans are not checked
  const pastDue = payments.filter((p) => liveLoanIds.has(p.loanId) && p.status === 'pending' && p.dueDate < today).length;
  if (pastDue) problems.push(`${pastDue} past-due installments not yet flagged overdue (run: npm run sync-overdue)`);

  console.log(problems.length ? problems.join('\n') : 'No problems found.');
  console.log(`\nChecked ${loans.length} loans.${FIX ? ` Repaired ${repaired}.` : ' Read-only: add --fix to repair the safe cases.'}`);
});
