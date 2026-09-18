const { Op } = require('sequelize');
const { sequelize, Payment, Loan, Member } = require('../models');
const { sendPaymentConfirmationSMS } = require('../utils/smsService');
const { invalidateStatsCache } = require('./loanController');

// @desc    Get payments for a loan
// @route   GET /api/payments?loanId=xxx
// @access  Private
const getPayments = async (req, res, next) => {
  try {
    const { loanId } = req.query;
    const parsedLoanId = parseInt(loanId, 10);
    if (!loanId || isNaN(parsedLoanId)) {
      return res.status(400).json({ message: 'A valid loanId query param is required' });
    }

    const payments = await Payment.findAll({
      where: { loanId: parsedLoanId },
      order: [['monthNumber', 'ASC']],
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a payment as paid with a custom amount.
//          If the member pays MORE than the installment, the excess
//          cascades forward — fully covering subsequent installments
//          in order (month by month). Any leftover partial excess
//          reduces the next installment's due amount.
// @route   PATCH /api/payments/:id/pay
// @access  Private
const markPaid = async (req, res, next) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId)) {
    return res.status(400).json({ message: 'Invalid payment ID format' });
  }

  const amountPaid = parseFloat(req.body.amountPaid);
  if (isNaN(amountPaid) || amountPaid <= 0) {
    return res.status(400).json({ message: 'Please provide a valid amount paid' });
  }

  try {
    let resultPayment = null;

    await sequelize.transaction(async (t) => {
      const payment = await Payment.findByPk(paymentId, { transaction: t });
      if (!payment) {
        const err = new Error('Payment not found');
        err.status = 404;
        throw err;
      }

      if (payment.status === 'paid') {
        const err = new Error('Payment already marked as paid');
        err.status = 400;
        throw err;
      }

      const now = new Date();
      const amountDue = parseFloat(payment.amountDue);

      // ── Step 1: Mark the current installment as paid ─────────
      payment.status     = 'paid';
      payment.amountPaid = amountPaid;
      payment.paidAt     = now;
      payment.isPartial  = amountPaid < amountDue;
      payment.isAutoPaid = false;
      await payment.save({ transaction: t });

      // ── Step 2: Calculate excess and cascade forward ─────────
      let excess = amountPaid - amountDue;

      if (excess > 0) {
        const pendingPayments = await Payment.findAll({
          where: {
            loanId: payment.loanId,
            status: { [Op.in]: ['pending', 'overdue'] },
          },
          order: [['monthNumber', 'ASC']],
          transaction: t,
        });

        for (const nextP of pendingPayments) {
          if (excess <= 0) break;
          const nextDue = parseFloat(nextP.amountDue);

          if (excess >= nextDue) {
            nextP.status     = 'paid';
            nextP.amountPaid = nextDue;
            nextP.paidAt     = now;
            nextP.isPartial  = false;
            nextP.isAutoPaid = true;
            excess           = Math.round((excess - nextDue) * 100) / 100;
            await nextP.save({ transaction: t });
          } else {
            nextP.amountDue = Math.round((nextDue - excess) * 100) / 100;
            await nextP.save({ transaction: t });
            break;
          }
        }
      }

      // ── Step 3: Sync loan totals ───
      const loan = await Loan.findByPk(payment.loanId, { transaction: t });
      if (loan) {
        const currentPaid = parseFloat(loan.paidAmount || 0);
        const currentRemaining = parseFloat(loan.remainingBalance || 0);

        loan.paidAmount       = Math.round((currentPaid + amountPaid) * 100) / 100;
        loan.remainingBalance = Math.max(0, Math.round((currentRemaining - amountPaid) * 100) / 100);

        const pendingCount = await Payment.count({
          where: {
            loanId: loan.id,
            status: { [Op.in]: ['pending', 'overdue'] },
          },
          transaction: t,
        });

        if (pendingCount === 0) loan.status = 'completed';

        await loan.save({ transaction: t });
      }

      resultPayment = payment;
    });

    // Fire-and-forget SMS notification outside the transaction
    if (resultPayment) {
      const fullLoan = await Loan.findByPk(resultPayment.loanId, {
        include: [{ model: Member, as: 'member' }],
      });
      if (fullLoan && fullLoan.member && fullLoan.member.contactNumber) {
        sendPaymentConfirmationSMS({
          memberName:       fullLoan.member.fullName || 'Customer',
          contactNumber:    fullLoan.member.contactNumber,
          amountPaid,
          monthNumber:      resultPayment.monthNumber,
          remainingBalance: fullLoan.remainingBalance,
        }).catch((smsErr) => {
          console.error('⚠️  Failed to dispatch payment confirmation SMS:', smsErr.message);
        });
      }
    }

    invalidateStatsCache();

    res.json(resultPayment);
  } catch (err) {
    next(err);
  }
};

// @desc    Revert a paid payment back to pending and reverse the loan balance.
//          Note: auto-paid cascaded months must be reverted individually if needed.
// @route   PATCH /api/payments/:id/unpay
// @access  Private
const markUnpaid = async (req, res, next) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId)) {
    return res.status(400).json({ message: 'Invalid payment ID format' });
  }

  try {
    let resultPayment = null;

    await sequelize.transaction(async (t) => {
      const payment = await Payment.findByPk(paymentId, { transaction: t });
      if (!payment) {
        const err = new Error('Payment not found');
        err.status = 404;
        throw err;
      }

      if (payment.status !== 'paid') {
        const err = new Error('Payment is not marked as paid');
        err.status = 400;
        throw err;
      }

      const previouslyPaid = parseFloat(payment.amountPaid || 0);

      // Revert this payment
      payment.status     = 'pending';
      payment.amountPaid = 0;
      payment.paidAt     = null;
      payment.isPartial  = false;
      payment.isAutoPaid = false;
      await payment.save({ transaction: t });

      // Reverse the loan balance
      const loan = await Loan.findByPk(payment.loanId, { transaction: t });
      if (loan) {
        const currentPaid = parseFloat(loan.paidAmount || 0);
        const currentRemaining = parseFloat(loan.remainingBalance || 0);

        loan.paidAmount       = Math.max(0, Math.round((currentPaid - previouslyPaid) * 100) / 100);
        loan.remainingBalance = Math.round((currentRemaining + previouslyPaid) * 100) / 100;

        if (loan.status === 'completed') loan.status = 'active';

        await loan.save({ transaction: t });
      }

      resultPayment = payment;
    });

    invalidateStatsCache();

    res.json(resultPayment);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPayments, markPaid, markUnpaid };

