// Run with: npm test   (inside /server)
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toCents, buildInstallments, buildSchedule, deriveLoanStatus, displayStatus,
  latestManualPayment, coveringWeeks, buildCascadeLog, planPayment, planReversal,
  planRepair, scheduleGapCents,
} = require('../services/loanMath');

const TODAY = '2026-10-01';

// ── Helpers that mirror what paymentController does inside its transaction ──

const makeLoan = (amounts, { startDate = '2026-10-01', totalRepayable } = {}) => {
  const total = totalRepayable ?? amounts.reduce((a, b) => a + b, 0);
  return {
    loan: { paidAmount: 0, remainingBalance: total, totalRepayable: total },
    rows: amounts.map((amountDue, i) => ({
      id: i + 1, monthNumber: i + 1, amountDue, amountPaid: 0,
      dueDate: buildSchedule({ loanId: 1, startDate, totalRepayable: total, weeks: amounts.length })[i].dueDate,
      paidAt: null, status: 'pending', isPartial: false, isAutoPaid: false, cascadeLog: null,
    })),
  };
};

const clone = (state) => JSON.parse(JSON.stringify(state));
let clock = 1_000_000;

const pay = (state, week, amount) => {
  const target = state.rows.find((r) => r.monthNumber === week);
  const now = new Date(clock += 1000);
  const plan = planPayment({
    rows: state.rows, targetId: target.id, amount,
    remainingBefore: state.loan.remainingBalance, now, today: TODAY,
  });
  const createdIds = [];
  const before = clone(state.rows);
  for (const { id, set } of plan.changes) Object.assign(state.rows.find((r) => r.id === id), set);
  if (plan.create) {
    const id = Math.max(...state.rows.map((r) => r.id)) + 1;
    state.rows.push({ id, ...plan.create, cascadeLog: null });
    createdIds.push(id);
  }
  target.cascadeLog = buildCascadeLog({ rows: before, plan, createdIds, loanBefore: state.loan, at: now.getTime() });
  state.loan.paidAmount = (toCents(state.loan.paidAmount) + toCents(amount)) / 100;
  state.loan.remainingBalance = (toCents(state.loan.remainingBalance) - toCents(amount)) / 100;
  return state;
};

const revert = (state, week) => {
  const target = state.rows.find((r) => r.monthNumber === week);
  const plan = planReversal({ rows: state.rows, targetId: target.id, loan: state.loan, today: TODAY });
  for (const { id, set } of plan.changes) Object.assign(state.rows.find((r) => r.id === id), set);
  state.rows = state.rows.filter((r) => !plan.deleteIds.includes(r.id));
  target.cascadeLog = null;
  state.loan.paidAmount = plan.loan.paidAmount;
  state.loan.remainingBalance = plan.loan.remainingBalance;
  return state;
};

const openSum = (state) =>
  state.rows.filter((r) => r.status !== 'paid').reduce((s, r) => s + toCents(r.amountDue), 0) / 100;
const dues = (state) => state.rows.map((r) => r.amountDue);
const comparable = (state) => ({
  loan: state.loan,
  rows: state.rows.map(({ id, amountDue, amountPaid, status, paidAt, isPartial, isAutoPaid }) =>
    ({ id, amountDue, amountPaid, status, paidAt: paidAt ? new Date(paidAt).toISOString() : null, isPartial, isAutoPaid })),
});

// ── Schedule ────────────────────────────────────────────────────────────────

test('installments always add up to the total and differ by at most Rs. 1', () => {
  for (const [total, weeks] of [[65000, 12], [10000, 3], [95625, 52], [7, 7], [13000, 10]]) {
    const parts = buildInstallments(total, weeks);
    assert.equal(parts.length, weeks);
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
    assert.ok(Math.max(...parts) - Math.min(...parts) <= 1);
    assert.ok(parts.every(Number.isInteger));
  }
  assert.deepEqual(buildInstallments(65000, 12), [...Array(8).fill(5417), ...Array(4).fill(5416)]);
});

test('non-whole totals are split to the cent', () => {
  const parts = buildInstallments(100.05, 2);
  assert.equal(toCents(parts[0]) + toCents(parts[1]), 10005);
});

test('due dates are weekly date strings and cross month and year ends', () => {
  const rows = buildSchedule({ loanId: 9, startDate: '2026-12-20', totalRepayable: 300, weeks: 3 });
  assert.deepEqual(rows.map((r) => r.dueDate), ['2026-12-27', '2027-01-03', '2027-01-10']);
  assert.deepEqual(rows.map((r) => r.monthNumber), [1, 2, 3]);
  assert.ok(rows.every((r) => r.loanId === 9 && r.status === 'pending'));
});

// ── Recording payments ──────────────────────────────────────────────────────

test('exact payment changes only its own row', () => {
  const s = pay(makeLoan([100, 100, 100]), 1, 100);
  assert.deepEqual(dues(s), [100, 100, 100]);
  assert.equal(s.rows[0].status, 'paid');
  assert.equal(s.rows[0].isPartial, false);
  assert.equal(s.loan.remainingBalance, 200);
  assert.equal(openSum(s), s.loan.remainingBalance);
});

test('partial payment carries the shortfall to the next open week (B3)', () => {
  const s = pay(makeLoan([100, 100, 100]), 1, 60);
  assert.equal(s.rows[0].isPartial, true);
  assert.equal(s.rows[0].amountPaid, 60);
  assert.deepEqual(dues(s), [100, 140, 100]);
  assert.equal(openSum(s), 240);
  assert.equal(s.loan.remainingBalance, 240);
});

test('partial payment of the last week adds an extension week', () => {
  let s = makeLoan([100, 100]);
  s = pay(s, 1, 100);
  s = pay(s, 2, 70);
  assert.equal(s.rows.length, 3);
  assert.deepEqual(s.rows[2], {
    ...s.rows[2], monthNumber: 3, amountDue: 30, status: 'pending',
    dueDate: '2026-10-22', // one week after week 2 (2026-10-15)
  });
  assert.equal(openSum(s), 30);
  assert.equal(deriveLoanStatus({ remainingBalance: s.loan.remainingBalance, rows: s.rows, today: TODAY }), 'active');
});

test('shortfall skips earlier open weeks and goes forward', () => {
  const s = pay(makeLoan([100, 100, 100]), 2, 60);
  assert.deepEqual(dues(s), [100, 100, 140]);
});

test('overpayment pays the oldest open weeks first and reduces the next one', () => {
  const s = pay(makeLoan([100, 100, 100, 100]), 1, 250);
  assert.deepEqual(s.rows.map((r) => [r.status, r.isAutoPaid, r.amountDue]), [
    ['paid', false, 100], ['paid', true, 100], ['pending', false, 50], ['pending', false, 100],
  ]);
  assert.equal(openSum(s), s.loan.remainingBalance);
});

test('overpayment on a later week covers an earlier open week first', () => {
  const s = pay(makeLoan([100, 100, 100]), 2, 150);
  assert.deepEqual(dues(s), [50, 100, 100]);
  assert.equal(s.rows[0].status, 'pending');
  assert.equal(openSum(s), 150);
});

test('paying the whole balance completes the loan', () => {
  const s = pay(makeLoan([100, 100, 100]), 1, 300);
  assert.ok(s.rows.every((r) => r.status === 'paid'));
  assert.equal(s.loan.remainingBalance, 0);
  assert.equal(deriveLoanStatus({ remainingBalance: 0, rows: s.rows, today: TODAY }), 'completed');
});

test('old rounded-up schedules are trimmed so the last week matches the balance', () => {
  // Pre-fix loan: 12 × 5,417 = 65,004 scheduled against a 65,000 balance
  const s = pay(makeLoan(Array(12).fill(5417), { totalRepayable: 65000 }), 1, 5417);
  assert.equal(s.rows[11].amountDue, 5413);
  assert.equal(openSum(s), s.loan.remainingBalance);
});

test('trimming closes weeks that reach zero', () => {
  const s = pay(makeLoan([100, 100, 3], { totalRepayable: 200 }), 1, 100);
  assert.deepEqual(s.rows.map((r) => [r.status, r.amountDue]), [['paid', 100], ['pending', 100], ['paid', 0]]);
  assert.equal(s.rows[2].isAutoPaid, true);
});

test('a gap left by older code is never moved onto the next week by a payment', () => {
  // Pre-fix partial payment: week 1 paid 60 of 100 and the 40 shortfall was never carried
  const s = makeLoan([100, 100, 100]);
  Object.assign(s.rows[0], { status: 'paid', amountPaid: 60, isPartial: true, paidAt: new Date(5000) });
  Object.assign(s.loan, { paidAmount: 60, remainingBalance: 240 });
  pay(s, 2, 100);
  assert.deepEqual(dues(s), [100, 100, 100]);
  assert.equal(s.loan.remainingBalance, 140);
  assert.equal(scheduleGapCents({ remainingBalance: s.loan.remainingBalance, rows: s.rows }), 4000); // left for planRepair
});

// The loan in the screenshots: the balance was one week (3,250) above the open weeks
const loanWithWeekGap = () => {
  const s = makeLoan(Array(10).fill(3250));
  for (let w = 1; w <= 5; w++) Object.assign(s.rows[w - 1], { status: 'paid', amountPaid: 3250, paidAt: new Date(w * 1000) });
  Object.assign(s.rows[4], { isAutoPaid: true }); // week 5: paid by an overpayment that was reverted by old code
  Object.assign(s.loan, { paidAmount: 13000, remainingBalance: 19500 }); // 32,500 − 4 × 3,250 cash
  return s;
};

test('partial payment carries only its own shortfall, not an older gap', () => {
  const s = pay(loanWithWeekGap(), 6, 2000);
  assert.equal(s.rows[6].amountDue, 4500); // 3,250 + 1,250 — was 7,750 before the fix
  assert.equal(s.loan.remainingBalance, 17500);
});

test('overpayment reduces only by its own excess, not an older gap', () => {
  const s = pay(loanWithWeekGap(), 6, 4000);
  assert.equal(s.rows[6].amountDue, 2500); // 3,250 − 750 — was 5,750 before the fix
  assert.equal(s.loan.remainingBalance, 15500);
});

test('a rounding-sized gap is still absorbed by the next payment', () => {
  const s = makeLoan([100, 100, 100], { totalRepayable: 302 });
  pay(s, 1, 100);
  assert.deepEqual(dues(s), [100, 102, 100]);
  assert.equal(openSum(s), s.loan.remainingBalance);
});

test('paying the whole balance closes the remaining weeks even with an older gap', () => {
  const s = loanWithWeekGap();
  pay(s, 6, 19500);
  assert.equal(s.loan.remainingBalance, 0);
  assert.ok(s.rows.every((r) => r.status === 'paid'));
});

// ── Reverting payments ──────────────────────────────────────────────────────

const scenarios = [
  { name: 'exact',                               setup: [],                          last: [1, 100] },
  { name: 'partial',                             setup: [],                          last: [1, 60] },
  { name: 'overpay and reduce',                  setup: [],                          last: [1, 250] },
  { name: 'pay everything',                      setup: [],                          last: [1, 400] },
  { name: 'last-week partial creates extension', setup: [[1, 100], [2, 100], [3, 100]], last: [4, 10] },
];

for (const { name, setup, last } of scenarios) {
  test(`reverting restores the exact previous state: ${name}`, () => {
    const s = makeLoan([100, 100, 100, 100]);
    for (const [week, amount] of setup) pay(s, week, amount);
    const before = clone(s);
    pay(s, ...last);
    revert(s, last[0]);
    assert.deepEqual(comparable(s), comparable(before));
  });
}

test('a chain of payments unwinds back to the original schedule', () => {
  const original = makeLoan([5417, 5417, 5416, 5416]);
  const s = clone(original);
  pay(s, 1, 3000);   // partial
  pay(s, 2, 9000);   // overpay
  pay(s, 4, 100);    // out of order, partial
  assert.equal(openSum(s), s.loan.remainingBalance);
  revert(s, 4);
  revert(s, 2);
  revert(s, 1);
  assert.deepEqual(comparable(s), comparable(original));
});

test('reverted open rows get a fresh overdue/pending status', () => {
  const s = makeLoan([100, 100], { startDate: '2026-09-01' }); // week 1 due 2026-09-08, before TODAY
  pay(s, 1, 100);
  revert(s, 1);
  assert.equal(s.rows[0].status, 'overdue');
  assert.equal(s.rows[1].status, 'pending'); // untouched rows keep their stored status
});

test('payments recorded before cascade logs revert with the old rules', () => {
  const at = new Date(10_000);
  const s = makeLoan([100, 100, 100]);
  Object.assign(s.rows[0], { status: 'paid', amountPaid: 250, paidAt: at });
  Object.assign(s.rows[1], { status: 'paid', amountPaid: 100, paidAt: at, isAutoPaid: true });
  Object.assign(s.rows[2], { amountDue: 50 });
  Object.assign(s.loan, { paidAmount: 250, remainingBalance: 50 });
  revert(s, 1);
  assert.deepEqual(s.rows.map((r) => [r.status, r.amountDue, r.amountPaid]), [
    ['pending', 100, 0], ['pending', 100, 0], ['pending', 100, 0],
  ]);
  assert.deepEqual(s.loan, { paidAmount: 0, remainingBalance: 300, totalRepayable: 300 });
});

test('legacy reversal never pushes the balance above the loan total (B4)', () => {
  const s = makeLoan([100, 100]);
  Object.assign(s.rows[0], { status: 'paid', amountPaid: 100, paidAt: new Date(1) });
  Object.assign(s.loan, { paidAmount: 100, remainingBalance: 150 }); // already inflated by the old bug
  revert(s, 1);
  assert.equal(s.loan.remainingBalance, 200);
});

// ── History helpers ─────────────────────────────────────────────────────────

test('only the most recent manual payment is revertible and auto rows know their source', () => {
  const s = makeLoan([100, 100, 100, 100]);
  pay(s, 1, 100);
  pay(s, 2, 200); // auto-pays week 3
  assert.equal(latestManualPayment(s.rows).monthNumber, 2);
  assert.deepEqual([...coveringWeeks(s.rows)], [[3, 2]]);
  revert(s, 2);
  assert.equal(latestManualPayment(s.rows).monthNumber, 1);
  assert.equal(coveringWeeks(s.rows).size, 0);
});

test('legacy auto-paid rows are linked by their shared paidAt', () => {
  const s = makeLoan([100, 100]);
  const at = new Date(42_000);
  Object.assign(s.rows[0], { status: 'paid', amountPaid: 200, paidAt: at });
  Object.assign(s.rows[1], { status: 'paid', amountPaid: 100, paidAt: new Date(42_000), isAutoPaid: true });
  assert.deepEqual([...coveringWeeks(s.rows)], [[2, 1]]);
});

test('status is read from the due date, not the stored flag', () => {
  assert.equal(displayStatus({ status: 'pending', dueDate: '2026-09-30' }, TODAY), 'overdue');
  assert.equal(displayStatus({ status: 'overdue', dueDate: '2026-10-01' }, TODAY), 'pending');
  assert.equal(displayStatus({ status: 'paid', dueDate: '2026-09-01' }, TODAY), 'paid');
  const rows = [{ status: 'pending', dueDate: '2026-09-30' }];
  assert.equal(deriveLoanStatus({ remainingBalance: 10, rows, today: TODAY }), 'overdue');
  assert.equal(deriveLoanStatus({ remainingBalance: 10, rows, today: '2026-09-30' }), 'active');
});

// ── Repairing loans ─────────────────────────────────────────────────────────

const applyRepair = (state) => {
  const plan = planRepair({ loan: state.loan, rows: state.rows, today: TODAY, now: new Date(clock += 1000) });
  for (const { id, set } of plan.changes) Object.assign(state.rows.find((r) => r.id === id), set);
  if (plan.create) state.rows.push({ id: Math.max(...state.rows.map((r) => r.id)) + 1, ...plan.create, cascadeLog: null });
  Object.assign(state.loan, { paidAmount: plan.loan.paidAmount, remainingBalance: plan.loan.remainingBalance });
  return plan;
};

test('repair leaves a healthy loan alone', () => {
  const s = makeLoan([100, 100, 100]);
  pay(s, 1, 60);
  pay(s, 2, 200); // covers 140 of week 2 and 60 of week 3
  const plan = planRepair({ loan: s.loan, rows: s.rows, today: TODAY });
  assert.deepEqual([plan.notes, plan.changes, plan.create], [[], [], null]);
});

test('repair reopens a week paid by a payment that no longer exists (the screenshot loan)', () => {
  const s = loanWithWeekGap();
  const plan = applyRepair(s);
  assert.deepEqual([s.rows[4].status, s.rows[4].amountDue, s.rows[4].isAutoPaid], ['pending', 3250, false]); // week 5
  assert.equal(s.loan.remainingBalance, 19500); // the balance was right; the week was wrongly closed
  assert.equal(plan.create, null);
  assert.equal(openSum(s), s.loan.remainingBalance);
  assert.match(plan.notes.join('\n'), /week 5 reopened/);
});

test('repair corrects a balance inflated by the old revert bug (B4)', () => {
  const s = makeLoan([100, 100, 100]);
  Object.assign(s.rows[0], { status: 'paid', amountPaid: 100, paidAt: new Date(1) });
  Object.assign(s.loan, { paidAmount: 0, remainingBalance: 300 }); // 100 received, but counted as unpaid
  const plan = applyRepair(s);
  assert.deepEqual([s.loan.paidAmount, s.loan.remainingBalance], [100, 200]);
  assert.equal(plan.create, null);
  assert.deepEqual(dues(s), [100, 100, 100]); // weeks 2 + 3 already add up to 200
  assert.equal(plan.notes.length, 2);
});

test('repair puts an uncarried old shortfall on one extra week', () => {
  const s = makeLoan([100, 100, 100]);
  Object.assign(s.rows[0], { status: 'paid', amountPaid: 60, isPartial: true, paidAt: new Date(5000) });
  Object.assign(s.loan, { paidAmount: 60, remainingBalance: 240 });
  const plan = applyRepair(s);
  assert.deepEqual(plan.create && [plan.create.monthNumber, plan.create.amountDue], [4, 40]);
  assert.equal(openSum(s), 240);
});

test('reverting a payment made before a repair keeps the corrected balance', () => {
  const s = makeLoan([100, 100, 100]);
  pay(s, 1, 100);
  s.loan.remainingBalance = 250; // corrupted after the payment (e.g. by old code)
  applyRepair(s);
  assert.equal(s.loan.remainingBalance, 200);
  revert(s, 1);
  assert.deepEqual([s.loan.paidAmount, s.loan.remainingBalance], [0, 300]);
});
