const Payment = require('../models/Payment');
const Loan    = require('../models/Loan');

// @desc    Get payments for a loan
// @route   GET /api/payments?loanId=xxx
// @access  Private
const getPayments = async (req, res) => {
  try {
    const { loanId } = req.query;
    if (!loanId) return res.status(400).json({ message: 'loanId query param required' });

    const payments = await Payment.find({ loanId }).sort({ monthNumber: 1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark a payment as paid with a custom amount.
//          If the member pays MORE than the installment, the excess
//          cascades forward — fully covering subsequent installments
//          in order (month by month). Any leftover partial excess
//          reduces the next installment's due amount.
// @route   PATCH /api/payments/:id/pay
// @access  Private
const markPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (payment.status === 'paid')
      return res.status(400).json({ message: 'Payment already marked as paid' });

    const amountPaid = parseFloat(req.body.amountPaid);
    if (isNaN(amountPaid) || amountPaid <= 0)
      return res.status(400).json({ message: 'Please provide a valid amount paid' });

    const now = new Date();

    // ── Step 1: Mark the current installment as paid ─────────
    payment.status     = 'paid';
    payment.amountPaid = amountPaid;
    payment.paidAt     = now;
    payment.isPartial  = amountPaid < payment.amountDue;
    payment.isAutoPaid = false;
    await payment.save();

    // ── Step 2: Calculate excess and cascade forward ─────────
    let excess = amountPaid - payment.amountDue;

    if (excess > 0) {
      // Fetch all remaining unpaid installments sorted oldest first
      const pendingPayments = await Payment.find({
        loanId: payment.loanId,
        status: { $in: ['pending', 'overdue'] },
      }).sort({ monthNumber: 1 });

      for (const next of pendingPayments) {
        if (excess <= 0) break;

        if (excess >= next.amountDue) {
          // Excess fully covers this installment → auto-mark as paid
          next.status     = 'paid';
          next.amountPaid = next.amountDue;
          next.paidAt     = now;
          next.isPartial  = false;
          next.isAutoPaid = true;   // flagged so UI can show "Auto-paid"
          excess          = Math.round((excess - next.amountDue) * 100) / 100;
          await next.save();
        } else {
          // Excess partially covers this installment → reduce its due amount
          next.amountDue = Math.round((next.amountDue - excess) * 100) / 100;
          excess         = 0;
          await next.save();
          break;
        }
      }
    }

    // ── Step 3: Sync loan totals ─────────────────────────────
    const loan = await Loan.findById(payment.loanId);
    if (loan) {
      loan.paidAmount       = Math.round((loan.paidAmount + amountPaid) * 100) / 100;
      loan.remainingBalance = Math.max(0, Math.round((loan.remainingBalance - amountPaid) * 100) / 100);

      // If no unpaid installments remain → complete the loan
      const pendingCount = await Payment.countDocuments({
        loanId: loan._id,
        status: { $in: ['pending', 'overdue'] },
      });
      if (pendingCount === 0) loan.status = 'completed';

      await loan.save();
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Revert a paid payment back to pending and reverse the loan balance.
//          Note: auto-paid cascaded months must be reverted individually if needed.
// @route   PATCH /api/payments/:id/unpay
// @access  Private
const markUnpaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (payment.status !== 'paid')
      return res.status(400).json({ message: 'Payment is not marked as paid' });

    const previouslyPaid = payment.amountPaid;

    // Revert this payment
    payment.status     = 'pending';
    payment.amountPaid = 0;
    payment.paidAt     = null;
    payment.isPartial  = false;
    payment.isAutoPaid = false;
    await payment.save();

    // Reverse the loan balance
    const loan = await Loan.findById(payment.loanId);
    if (loan) {
      loan.paidAmount       = Math.max(0, Math.round((loan.paidAmount - previouslyPaid) * 100) / 100);
      loan.remainingBalance = Math.round((loan.remainingBalance + previouslyPaid) * 100) / 100;

      if (loan.status === 'completed') loan.status = 'active';

      await loan.save();
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPayments, markPaid, markUnpaid };
