/**
 * Loan and payment maths. Pure functions only (no database access), so every money rule can be
 * unit-tested (tests/loanMath.test.js). Amounts are handled in integer cents internally and
 * returned in rupees with at most 2 decimals.
 *
 * A schedule row (installment) is a plain object with the Payment columns:
 *   { id, monthNumber, amountDue, amountPaid, status, dueDate, paidAt, isPartial, isAutoPaid, cascadeLog }
 * `monthNumber` is the week number; the column name predates weekly loans.
 */
const { addDays } = require('../utils/dates');
const httpError = require('../utils/httpError');

const toCents   = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (cents) => cents / 100;

const isOpen     = (row) => row.status === 'pending' || row.status === 'overdue';
const openStatus = (dueDate, today) => (dueDate < today ? 'overdue' : 'pending');
const byWeek     = (a, b) => a.monthNumber - b.monthNumber;
const isManualPayment = (row) => row.status === 'paid' && !row.isAutoPaid;
const sameInstant = (a, b) => a != null && b != null && new Date(a).getTime() === new Date(b).getTime();

// ── Schedule ────────────────────────────────────────────────────────────────

// Split `total` into `weeks` installments that add up exactly and differ by at most one unit:
// Rs. 1 for whole-rupee totals, otherwise 1 cent. 65,000 over 12 weeks → 8 × 5,417 + 4 × 5,416.
const buildInstallments = (total, weeks) => {
  const cents = toCents(total);
  const unit  = cents % 100 === 0 ? 100 : 1;
  const units = cents / unit;
  const base  = Math.floor(units / weeks);
  const extra = units - base * weeks;
  return Array.from({ length: weeks }, (_, i) => fromCents((base + (i < extra ? 1 : 0)) * unit));
};

// Weekly schedule rows for a new loan; week i is due i × 7 days after startDate ('YYYY-MM-DD')
const buildSchedule = ({ loanId, startDate, totalRepayable, weeks }) =>
  buildInstallments(totalRepayable, weeks).map((amountDue, i) => ({
    loanId,
    monthNumber: i + 1,
    amountDue,
    amountPaid:  0,
    dueDate:     addDays(startDate, 7 * (i + 1)),
    paidAt:      null,
    status:      'pending',
  }));

// ── Read-time status ────────────────────────────────────────────────────────

// An open installment is overdue as soon as its due date has passed, whatever the stored status says
const displayStatus = (row, today) => (isOpen(row) ? openStatus(row.dueDate, today) : row.status);

// A loan is completed only when nothing is owed (B12), overdue when an open installment is past due
const deriveLoanStatus = ({ remainingBalance, rows, today }) => {
  if (toCents(remainingBalance) <= 0) return 'completed';
  return rows.some((r) => isOpen(r) && r.dueDate < today) ? 'overdue' : 'active';
};

// Balance minus what the open installments add up to. Positive: part of the balance is on no week.
// Negative: the weeks ask for more than is owed. Zero on a healthy loan.
const scheduleGapCents = ({ remainingBalance, rows }) =>
  toCents(remainingBalance) - rows.filter(isOpen).reduce((sum, r) => sum + toCents(r.amountDue), 0);

// Old schedules were rounded to the rupee each week, so up to Rs. 1 per week is rounding, not a fault
const roundingToleranceCents = (rows) => 100 * rows.length;

// ── Payment history ─────────────────────────────────────────────────────────

const parseCascadeLog = (row) => {
  if (!row.cascadeLog) return null;
  try { return JSON.parse(row.cascadeLog); } catch { return null; }
};

// Order in which manual payments were recorded. Payments recorded before cascade logs existed
// fall back to paidAt (second precision); they are all older than any logged payment.
const paymentOrder = (row) => {
  const log = parseCascadeLog(row);
  if (log && log.at) return log.at;
  return row.paidAt ? new Date(row.paidAt).getTime() : 0;
};

const latestManualPayment = (rows) =>
  rows.filter(isManualPayment).reduce((latest, row) => {
    if (!latest) return row;
    const diff = paymentOrder(row) - paymentOrder(latest);
    return diff > 0 || (diff === 0 && row.monthNumber > latest.monthNumber) ? row : latest;
  }, null);

// Map of auto-paid row id → week number of the manual payment whose overpayment covered it
const coveringWeeks = (rows) => {
  const covered = new Map();
  const manual = rows.filter(isManualPayment).sort((a, b) => paymentOrder(a) - paymentOrder(b));
  for (const payment of manual) {
    const log = parseCascadeLog(payment);
    const touched = log
      ? log.rows.map((r) => r.id)
      : rows.filter((r) => r.isAutoPaid && sameInstant(r.paidAt, payment.paidAt)).map((r) => r.id);
    for (const id of touched) {
      if (id !== payment.id) covered.set(id, payment.monthNumber); // later payments win
    }
  }
  for (const [id] of covered) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.status !== 'paid' || !row.isAutoPaid) covered.delete(id);
  }
  return covered;
};

// The fields a reversal needs to put a row back exactly as it was
const snapshotRow = (row) => ({
  status:     row.status,
  amountDue:  Number(row.amountDue),
  amountPaid: Number(row.amountPaid || 0),
  paidAt:     row.paidAt ? new Date(row.paidAt).toISOString() : null,
  isPartial:  Boolean(row.isPartial),
  isAutoPaid: Boolean(row.isAutoPaid),
});

// Stored on the manual payment's row: how every row it touched looked before, which rows it
// created and the loan totals before, so planReversal can restore them exactly.
// `rows` must be the state before the plan was applied; `at` (ms) orders payments for undo.
const buildCascadeLog = ({ rows, plan, createdIds, loanBefore, at }) => JSON.stringify({
  v: 1,
  at,
  rows: plan.changes.map(({ id }) => ({ id, before: snapshotRow(rows.find((r) => r.id === id)) })),
  created: createdIds,
  loan: {
    paidAmount:       Number(loanBefore.paidAmount || 0),
    remainingBalance: Number(loanBefore.remainingBalance || 0),
  },
});

// ── Recording a payment ─────────────────────────────────────────────────────

/**
 * Every schedule change caused by receiving `amount` for installment `targetId`:
 *
 *  1. The target installment records the full cash amount.
 *  2. Any excess pays the oldest open installments first (FIFO). Fully covered rows become
 *     auto-paid, and the next one is reduced by whatever is left.
 *  3. The open installments are then brought in line with the loan's new remaining balance.
 *     - A gap (a partial payment, B3) is carried to the next open installment after the target,
 *       or to a new extension week when there is none, so the shortfall is still collected.
 *     - A surplus (older schedules rounded up, B10) is taken off the latest installments;
 *       any that reach zero are closed.
 *     - A gap that existed BEFORE this payment (the balance was above the open installments, left
 *       by older code or a rollback) is never moved onto a week here, unless it is only rounding.
 *       It is shown on the loan page and fixed by `npm run check-loans -- --fix` (planRepair).
 *
 * The caller must already have checked that the target is open and that amount ≤ remainingBefore.
 * Returns { changes: [{ id, set }], create }: `set` holds new column values and `create` is
 * an extension row to insert (or null).
 */
const planPayment = ({ rows, targetId, amount, remainingBefore, now, today }) => {
  const target = rows.find((r) => r.id === targetId);
  const amountC = toCents(amount);
  const dueC = toCents(target.amountDue);
  const remainingAfterC = toCents(remainingBefore) - amountC;

  const changes = new Map();
  const set = (id, fields) => changes.set(id, { ...changes.get(id), ...fields });

  set(target.id, {
    status: 'paid', amountPaid: fromCents(amountC), paidAt: now,
    isPartial: amountC < dueC, isAutoPaid: false,
  });

  const open = rows
    .filter((r) => r.id !== target.id && isOpen(r))
    .sort(byWeek)
    .map((row) => ({ row, dueC: toCents(row.amountDue), closed: false }));
  const preGapC = scheduleGapCents({ remainingBalance: remainingBefore, rows });

  let excessC = amountC - dueC;
  for (const o of open) {
    if (excessC <= 0) break;
    if (excessC >= o.dueC) {
      set(o.row.id, {
        status: 'paid', amountPaid: fromCents(o.dueC), paidAt: now,
        isPartial: false, isAutoPaid: true,
      });
      excessC -= o.dueC;
      o.closed = true;
    } else {
      o.dueC -= excessC;
      set(o.row.id, { amountDue: fromCents(o.dueC) });
      excessC = 0;
    }
  }

  const stillOpen = open.filter((o) => !o.closed);
  let gapC = remainingAfterC - stillOpen.reduce((sum, o) => sum + o.dueC, 0);
  if (preGapC > roundingToleranceCents(rows)) gapC -= preGapC; // only this payment's own shortfall
  let create = null;

  if (gapC > 0) {
    const next = stillOpen.find((o) => o.row.monthNumber > target.monthNumber);
    if (next) {
      next.dueC += gapC;
      set(next.row.id, { amountDue: fromCents(next.dueC) });
    } else {
      const last = rows.reduce((a, b) => (b.monthNumber > a.monthNumber ? b : a));
      const dueDate = addDays(last.dueDate, 7);
      create = {
        monthNumber: last.monthNumber + 1,
        amountDue:   fromCents(gapC),
        amountPaid:  0,
        dueDate,
        paidAt:      null,
        status:      openStatus(dueDate, today),
        isPartial:   false,
        isAutoPaid:  false,
      };
    }
  } else if (gapC < 0) {
    for (const o of [...stillOpen].reverse()) {
      if (gapC >= 0) break;
      const take = Math.min(o.dueC, -gapC);
      o.dueC -= take;
      gapC += take;
      set(o.row.id, o.dueC === 0
        ? { amountDue: 0, status: 'paid', amountPaid: 0, paidAt: now, isPartial: false, isAutoPaid: true }
        : { amountDue: fromCents(o.dueC) });
    }
  }

  return { changes: [...changes].map(([id, fields]) => ({ id, set: fields })), create };
};

// ── Reverting a payment ─────────────────────────────────────────────────────

/**
 * Undo the manual payment on `targetId`. Only the latest manual payment on a loan may be undone
 * (the caller checks this), so nothing has changed the rows it touched since it was recorded.
 *
 * Payments with a cascade log are restored exactly from the snapshots taken when they were
 * recorded. Older payments are reconstructed from the pre-log rules: auto-paid rows share the
 * payment's paidAt, any leftover excess reduced the oldest open row, and shortfalls were never
 * carried forward.
 *
 * Returns { changes: [{ id, set }], deleteIds, loan: { paidAmount, remainingBalance } }.
 */
const planReversal = ({ rows, targetId, loan, today }) => {
  const target = rows.find((r) => r.id === targetId);
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const log = parseCascadeLog(target);

  // The loan totals move back by exactly the cash of this payment. Normally that equals the totals
  // saved in the log; it stays right even if planRepair corrected the loan after the payment.
  const cashC = toCents(target.amountPaid);
  const loanAfter = {
    paidAmount:       fromCents(Math.max(0, toCents(loan.paidAmount) - cashC)),
    remainingBalance: fromCents(Math.min(toCents(loan.totalRepayable), toCents(loan.remainingBalance) + cashC)),
  };

  if (log) {
    const changes = log.rows.map(({ id, before }) => {
      const row = rowById.get(id);
      if (!row) throw httpError(409, 'The payment schedule has changed since this payment was recorded');
      return {
        id,
        set: {
          ...before,
          paidAt: before.paidAt ? new Date(before.paidAt) : null,
          status: before.status === 'paid' ? 'paid' : openStatus(row.dueDate, today),
        },
      };
    });
    const deleteIds = log.created || [];
    for (const id of deleteIds) {
      const row = rowById.get(id);
      if (row && !isOpen(row)) {
        throw httpError(409, `Week ${row.monthNumber} has been paid since; revert it first`);
      }
    }
    return { changes, deleteIds, loan: loanAfter };
  }

  const reopen = (row, extra = {}) => ({
    id: row.id,
    set: {
      status: openStatus(row.dueDate, today), amountPaid: 0, paidAt: null,
      isPartial: false, isAutoPaid: false, ...extra,
    },
  });

  const autoRows = rows.filter((r) =>
    r.id !== target.id && r.status === 'paid' && r.isAutoPaid && sameInstant(r.paidAt, target.paidAt));
  const changes = [reopen(target), ...autoRows.map((r) => reopen(r, { amountDue: Number(r.amountPaid) }))];

  const leftoverC = cashC - toCents(target.amountDue) - autoRows.reduce((s, r) => s + toCents(r.amountPaid), 0);
  if (leftoverC > 0) {
    const restored = new Set([target.id, ...autoRows.map((r) => r.id)]);
    const reduced = rows.filter((r) => !restored.has(r.id) && isOpen(r)).sort(byWeek)[0];
    if (reduced) changes.push({ id: reduced.id, set: { amountDue: fromCents(toCents(reduced.amountDue) + leftoverC) } });
  }

  return { changes, deleteIds: [], loan: loanAfter };
};

// ── Repairing a loan ────────────────────────────────────────────────────────

/**
 * Bring one loan back in line with the cash actually received (used by scripts/check-loans.js).
 *
 * The truth is the cash on manual payments: auto-paid rows only record what an overpayment covered,
 * their cash is already on the manual row. So:
 *   paidAmount = Σ amountPaid of manual payments, remainingBalance = totalRepayable − paidAmount.
 * Then the open installments are made to add up to that balance:
 *   - Missing money first reopens auto-paid weeks that no recorded payment covers any more (left
 *     when the payment that covered them was reverted by older code, B4), then any rest becomes
 *     one extra week after the last one.
 *   - Too much is taken off the latest open weeks (weeks that reach zero are closed).
 *
 * Returns { loan: { paidAmount, remainingBalance, status }, changes: [{ id, set }], create, notes }.
 * `notes` explains every change in plain words; no change at all means the loan is healthy.
 */
const planRepair = ({ loan, rows, today, now = new Date() }) => {
  const notes = [];
  const rs = (cents) => `Rs. ${fromCents(cents).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const totalC = toCents(loan.totalRepayable);
  const cashC = rows.filter(isManualPayment).reduce((sum, r) => sum + toCents(r.amountPaid), 0);
  const balanceC = Math.max(0, totalC - cashC);
  if (cashC > totalC) notes.push(`received ${rs(cashC)}, which is ${rs(cashC - totalC)} more than the loan total — review by hand`);

  if (toCents(loan.paidAmount) !== cashC) {
    notes.push(`paid so far ${rs(toCents(loan.paidAmount))} → ${rs(cashC)} (the cash on its payments)`);
  }
  if (toCents(loan.remainingBalance) !== balanceC) {
    notes.push(`balance ${rs(toCents(loan.remainingBalance))} → ${rs(balanceC)} (total − paid)`);
  }

  const changes = new Map();
  const set = (id, fields) => changes.set(id, { ...changes.get(id), ...fields });
  const open = rows.filter(isOpen).sort(byWeek).map((row) => ({ row, dueC: toCents(row.amountDue) }));
  let gapC = balanceC - open.reduce((sum, o) => sum + o.dueC, 0);
  let create = null;

  if (gapC > 0) {
    const covered = coveringWeeks(rows);
    const orphans = rows
      .filter((r) => r.status === 'paid' && r.isAutoPaid && !covered.has(r.id) && toCents(r.amountPaid) > 0)
      .sort(byWeek);
    for (const r of orphans) {
      const amountC = toCents(r.amountPaid);
      if (amountC > gapC) continue;
      set(r.id, {
        status: openStatus(r.dueDate, today), amountDue: fromCents(amountC), amountPaid: 0,
        paidAt: null, isPartial: false, isAutoPaid: false,
      });
      notes.push(`week ${r.monthNumber} reopened (${rs(amountC)}): it was marked paid by a payment that no longer exists`);
      gapC -= amountC;
    }
    if (gapC > 0) {
      const last = rows.reduce((a, b) => (b.monthNumber > a.monthNumber ? b : a));
      const dueDate = addDays(last.dueDate, 7);
      create = {
        monthNumber: last.monthNumber + 1, amountDue: fromCents(gapC), amountPaid: 0, dueDate,
        paidAt: null, status: openStatus(dueDate, today), isPartial: false, isAutoPaid: false,
      };
      notes.push(`week ${create.monthNumber} added for ${rs(gapC)} of the balance that was on no week`);
    }
  } else if (gapC < 0) {
    for (const o of [...open].reverse()) {
      if (gapC >= 0) break;
      const take = Math.min(o.dueC, -gapC);
      o.dueC -= take;
      gapC += take;
      set(o.row.id, o.dueC === 0
        ? { amountDue: 0, status: 'paid', amountPaid: 0, paidAt: now, isPartial: false, isAutoPaid: true }
        : { amountDue: fromCents(o.dueC) });
      notes.push(`week ${o.row.monthNumber} reduced by ${rs(take)}${o.dueC === 0 ? ' and closed' : ''} (the weeks asked for more than the balance)`);
    }
  }

  const changed = rows.map((r) => ({ ...r, ...changes.get(r.id) }));
  return {
    loan: {
      paidAmount:       fromCents(cashC),
      remainingBalance: fromCents(balanceC),
      status:           deriveLoanStatus({ remainingBalance: fromCents(balanceC), rows: [...changed, ...(create ? [create] : [])], today }),
    },
    changes: [...changes].map(([id, fields]) => ({ id, set: fields })),
    create,
    notes,
  };
};

module.exports = {
  toCents,
  fromCents,
  isOpen,
  buildInstallments,
  buildSchedule,
  displayStatus,
  deriveLoanStatus,
  scheduleGapCents,
  roundingToleranceCents,
  parseCascadeLog,
  latestManualPayment,
  coveringWeeks,
  buildCascadeLog,
  planPayment,
  planReversal,
  planRepair,
};
