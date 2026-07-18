const Loan    = require('../models/Loan');
const Member  = require('../models/Member');
const Payment = require('../models/Payment');

// Helper — generate monthly payment schedule for a loan
const generateSchedule = (loanId, startDate, monthlyInstallment, duration) => {
  const payments = [];
  const start = new Date(startDate);

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    payments.push({
      loanId,
      monthNumber: i,
      amountDue:   Math.round(monthlyInstallment),
      amountPaid:  0,
      dueDate,
      paidAt:      null,
      status:      'pending',
    });
  }
  return payments;
};

// @desc    Get all loans (with member info populated)
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate('memberId', 'fullName village idNumber')
      .sort({ createdAt: -1 });

    // Flatten for frontend compatibility
    const result = loans.map((l) => ({
      _id:                l._id,
      memberId:           l.memberId._id,
      memberName:         l.memberId.fullName,
      memberVillage:      l.memberId.village,
      loanAmount:         l.loanAmount,
      interestRate:       l.interestRate,
      loanDuration:       l.loanDuration,
      startDate:          l.startDate,
      monthlyInstallment: l.monthlyInstallment,
      totalRepayable:     l.totalRepayable,
      paidAmount:         l.paidAmount,
      remainingBalance:   l.remainingBalance,
      status:             l.status,
      grantedAt:          l.createdAt,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/loans/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const [totalMembers, loans] = await Promise.all([
      Member.countDocuments(),
      Loan.find(),
    ]);

    const activeLoans      = loans.filter(l => l.status === 'active').length;
    const overdueLoans     = loans.filter(l => l.status === 'overdue').length;
    const totalAmountLent  = loans.reduce((s, l) => s + l.loanAmount, 0);

    // Pending payments this month
    const now       = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const pendingPayments = await Payment.countDocuments({
      status:  'pending',
      dueDate: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const collectedThisMonth = await Payment.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]);

    // Recent activity — last 5 paid payments
    const recentPayments = await Payment.find({ status: 'paid' })
      .sort({ paidAt: -1 })
      .limit(5)
      .populate({ path: 'loanId', populate: { path: 'memberId', select: 'fullName' } });

    const recentActivity = recentPayments.map((p) => ({
      id:     p._id,
      type:   'payment',
      member: p.loanId?.memberId?.fullName || 'Unknown',
      amount: p.amountPaid,
      date:   p.paidAt,
      note:   `Month ${p.monthNumber} payment`,
    }));

    res.json({
      totalMembers,
      activeLoans,
      overdueLoans,
      totalAmountLent,
      pendingPayments,
      collectedThisMonth: collectedThisMonth[0]?.total || 0,
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Grant a loan (auto-generates payment schedule)
// @route   POST /api/loans
// @access  Private
const createLoan = async (req, res) => {
  try {
    const { memberId, loanAmount, interestRate, loanDuration, startDate } = req.body;

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const rate              = parseFloat(interestRate) || 30;
    const amount            = parseFloat(loanAmount);
    const duration          = parseInt(loanDuration);
    const totalRepayable    = Math.round(amount * (1 + rate / 100));
    const monthlyInstallment = Math.round(totalRepayable / duration);

    const loan = await Loan.create({
      memberId,
      loanAmount:         amount,
      interestRate:       rate,
      loanDuration:       duration,
      startDate:          new Date(startDate),
      monthlyInstallment,
      totalRepayable,
      paidAmount:         0,
      remainingBalance:   totalRepayable,
      status:             'active',
    });

    // Auto-generate monthly payment schedule
    const schedule = generateSchedule(loan._id, startDate, monthlyInstallment, duration);
    await Payment.insertMany(schedule);

    res.status(201).json({ ...loan.toObject(), memberName: member.fullName, memberVillage: member.village });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getLoans, getStats, createLoan };
