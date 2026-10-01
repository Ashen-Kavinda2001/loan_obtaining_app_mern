const { sequelize, Payment, Loan, Member } = require('../models');
const { sendPaymentConfirmationSMS } = require('../utils/smsService');
const { invalidateStatsCache } = require('./loanController');
const { todayLocal } = require('../utils/dates');
const httpError = require('../utils/httpError');
const {
  toCents, isOpen, displayStatus, deriveLoanStatus, parseCascadeLog, latestManualPayment,
  coveringWeeks, buildCascadeLog, planPayment, planReversal,
} = require('../services/loanMath');

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const formatRs = (value) => `Rs. ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plain = (row) => row.get({ plain: true });

/**
 * Locks the loan, then every installment of it, in that order, so all pay/unpay operations on one
 * loan run one at a time (B7). Every read that decides anything is a locking read, so it sees the
 * latest committed rows even under REPEATABLE READ, where a plain SELECT would read an older snapshot.
 */
const lockLoanSchedule = async (loanId, t) => {
  const loan = await Loan.findByPk(loanId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!loan) throw httpError(404, 'Loan not found');
  const rows = await Payment.findAll({
    where: { loanId },
    order: [['monthNumber', 'ASC']],
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  return { loan, rows };
};

const findLoanIdOf = async (paymentId) => {
  const ref = await Payment.findByPk(paymentId, { attributes: ['id', 'loanId'] });
  if (!ref) throw httpError(404, 'Payment not found');
  return ref.loanId;
};

// @desc    Get the payment schedule of a loan
// @route   GET /api/payments?loanId=xxx
// @access  Private
const getPayments = async (req, res, next) => {
  try {
    const { loanId } = req.valid.query;
    const loan = await Loan.findByPk(loanId, { attributes: ['id'] });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const payments = await Payment.findAll({ where: { loanId }, order: [['monthNumber', 'ASC']] });
    const rows = payments.map(plain);
    const today = todayLocal();
    const latest = latestManualPayment(rows);
    const covered = coveringWeeks(rows);

    res.json(payments.map((p, i) => ({
      ...p.toJSON(),
      status:           displayStatus(rows[i], today),
      canRevert:        latest !== null && latest.id === p.id,
      coveredByWeek:    covered.get(p.id) ?? null,
      shortfallCarried: Boolean(p.isPartial && rows[i].cascadeLog),
    })));
  } catch (err) {
    next(err);
  }
};

// @desc    Record a payment against an installment.
//          Excess pays later installments, a shortfall is carried forward, and the loan completes
//          only when the balance reaches zero (see services/loanMath.planPayment).
//          Send an Idempotency-Key header (8–64 chars of A-Z a-z 0-9 _ -) to make a retry safe:
//          a repeated key returns the original result instead of paying twice.
// @route   POST /api/payments/:id/pay
//          (POST, not PATCH: some shared-hosting WAF/ModSecurity configs silently
//          blackhole PATCH requests that carry a JSON body; POST with the same
//          body is unaffected — see /unpay, which has no body and works fine as PATCH.)
// @access  Private
const markPaid = async (req, res, next) => {
  const { id: paymentId } = req.valid.params;
  const { amountPaid } = req.valid.body;
  const idempotencyKey = req.get('Idempotency-Key') || null;
  if (idempotencyKey && !IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
    return res.status(400).json({ message: 'Invalid Idempotency-Key header' });
  }

  try {
    const loanId = await findLoanIdOf(paymentId);
    let result = null;
    let replayed = false;

    await sequelize.transaction(async (t) => {
      const { loan, rows } = await lockLoanSchedule(loanId, t);
      const target = rows.find((r) => r.id === paymentId);
      if (!target) throw httpError(404, 'Payment not found');

      if (idempotencyKey) {
        const prior = rows.find((r) => r.idempotencyKey === idempotencyKey);
        if (prior) {
          if (prior.id !== paymentId) throw httpError(409, 'This request key was already used for a different payment');
          result = prior;
          replayed = true;
          return;
        }
      }

      if (!isOpen(target)) throw httpError(400, 'Payment already marked as paid');

      // B11: the cash can never exceed what is still owed
      const remainingBefore = Number(loan.remainingBalance || 0);
      if (toCents(amountPaid) > toCents(remainingBefore)) {
        throw httpError(400, `Amount paid (${formatRs(amountPaid)}) cannot exceed the remaining loan balance (${formatRs(remainingBefore)})`);
      }

      const now = new Date();
      const today = todayLocal();
      const before = rows.map(plain);
      const plan = planPayment({ rows: before, targetId: paymentId, amount: amountPaid, remainingBefore, now, today });

      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const { id, set } of plan.changes) {
        if (id !== paymentId) await byId.get(id).update(set, { transaction: t });
      }
      const createdIds = [];
      let created = null;
      if (plan.create) {
        created = await Payment.create({ loanId, ...plan.create }, { transaction: t });
        createdIds.push(created.id);
      }

      const targetChange = plan.changes.find((c) => c.id === paymentId);
      await target.update({
        ...targetChange.set,
        recordedBy:     req.user.id,
        idempotencyKey,
        cascadeLog:     buildCascadeLog({ rows: before, plan, createdIds, loanBefore: loan, at: now.getTime() }),
      }, { transaction: t });

      const remainingBalance = (toCents(remainingBefore) - toCents(amountPaid)) / 100;
      await loan.update({
        paidAmount:       (toCents(loan.paidAmount) + toCents(amountPaid)) / 100,
        remainingBalance,
        status:           deriveLoanStatus({
          remainingBalance,
          rows: [...rows.map(plain), ...(created ? [plain(created)] : [])],
          today,
        }),
      }, { transaction: t });

      result = target;
    });

    if (replayed) return res.json(result);

    invalidateStatsCache();
    res.json(result);

    // Fire-and-forget SMS receipt; a slow gateway never delays the response
    setImmediate(async () => {
      try {
        const fullLoan = await Loan.findByPk(loanId, { include: [{ model: Member, as: 'member' }] });
        if (fullLoan && fullLoan.member && fullLoan.member.contactNumber) {
          await sendPaymentConfirmationSMS({
            memberName:       fullLoan.member.fullName || 'Customer',
            contactNumber:    fullLoan.member.contactNumber,
            amountPaid,
            monthNumber:      result.monthNumber,
            remainingBalance: fullLoan.remainingBalance,
          });
        }
      } catch (smsErr) {
        console.error('⚠️  Failed to dispatch payment confirmation SMS:', smsErr.message);
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Revert the most recent payment on a loan, restoring the schedule and balance exactly
//          as they were before it (B4). Weeks paid automatically by an overpayment are reverted
//          together with the payment that covered them.
// @route   PATCH /api/payments/:id/unpay
// @access  Private (admin)
const markUnpaid = async (req, res, next) => {
  const { id: paymentId } = req.valid.params;

  try {
    const loanId = await findLoanIdOf(paymentId);
    let result = null;

    await sequelize.transaction(async (t) => {
      const { loan, rows } = await lockLoanSchedule(loanId, t);
      const target = rows.find((r) => r.id === paymentId);
      if (!target) throw httpError(404, 'Payment not found');
      if (target.status !== 'paid') throw httpError(400, 'Payment is not marked as paid');

      const current = rows.map(plain);
      if (target.isAutoPaid) {
        const sourceWeek = coveringWeeks(current).get(target.id);
        throw httpError(400, sourceWeek
          ? `Week ${target.monthNumber} was paid by the overpayment recorded on Week ${sourceWeek}. Revert Week ${sourceWeek} instead.`
          : `Week ${target.monthNumber} was paid automatically and cannot be reverted on its own.`);
      }

      const latest = latestManualPayment(current);
      if (latest.id !== target.id) {
        throw httpError(409, `Only the most recent payment on this loan can be reverted. Revert Week ${latest.monthNumber} first.`);
      }

      const today = todayLocal();
      const plan = planReversal({ rows: current, targetId: paymentId, loan: plain(loan), today });
      const byId = new Map(rows.map((r) => [r.id, r]));

      for (const { id, set } of plan.changes) {
        if (id !== paymentId) await byId.get(id).update(set, { transaction: t });
      }
      if (plan.deleteIds.length) {
        await Payment.destroy({ where: { id: plan.deleteIds, loanId }, transaction: t });
      }

      const targetChange = plan.changes.find((c) => c.id === paymentId);
      const recordedBy = target.recordedBy;
      const amount = Number(target.amountPaid);
      await target.update({
        ...targetChange.set,
        recordedBy:     null,
        idempotencyKey: null,
        cascadeLog:     null,
        reversedBy:     req.user.id,
        reversedAt:     new Date(),
      }, { transaction: t });

      const remaining = rows.filter((r) => !plan.deleteIds.includes(r.id)).map(plain);
      await loan.update({
        paidAmount:       plan.loan.paidAmount,
        remainingBalance: plan.loan.remainingBalance,
        status:           deriveLoanStatus({ remainingBalance: plan.loan.remainingBalance, rows: remaining, today }),
      }, { transaction: t });

      // Until the audit-log table exists (S14), keep a trace of every reversal in the server log
      console.info(`[audit] payment reverted: loan=${loanId} week=${target.monthNumber} amount=${amount} ` +
        `recordedBy=${recordedBy ?? 'unknown'} reversedBy=${req.user.id} legacy=${!parseCascadeLog(current.find((r) => r.id === paymentId))}`);

      result = target;
    });

    invalidateStatsCache();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPayments, markPaid, markUnpaid };
