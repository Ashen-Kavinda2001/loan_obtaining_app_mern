const { Op } = require('sequelize');
const { sequelize, Loan, Member, Payment } = require('../models');

// Helper — generate weekly payment schedule for a loan
const generateSchedule = (loanId, startDate, weeklyInstallment, duration) => {
  const payments = [];
  const start = new Date(startDate);

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + 7 * i);

    payments.push({
      loanId,
      monthNumber: i,
      amountDue:   Math.round(weeklyInstallment),
      amountPaid:  0,
      dueDate,
      paidAt:      null,
      status:      'pending',
    });
  }
  return payments;
};

// Helper — sync overdue status for past-due pending installments and loans
const syncOverdueStatus = async () => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Mark pending payments whose dueDate has passed as overdue
    await Payment.update(
      { status: 'overdue' },
      {
        where: {
          status: 'pending',
          dueDate: { [Op.lt]: todayStr },
        },
      }
    );

    // 2. Find all loans that have overdue payments
    const overduePayments = await Payment.findAll({
      where: { status: 'overdue' },
      attributes: ['loanId'],
      group: ['loanId'],
    });

    const overdueLoanIds = overduePayments.map((p) => p.loanId);

    if (overdueLoanIds.length > 0) {
      await Loan.update(
        { status: 'overdue' },
        {
          where: {
            id: { [Op.in]: overdueLoanIds },
            status: 'active',
          },
        }
      );
      await Loan.update(
        { status: 'active' },
        {
          where: {
            id: { [Op.notIn]: overdueLoanIds },
            status: 'overdue',
          },
        }
      );
    } else {
      await Loan.update(
        { status: 'active' },
        {
          where: { status: 'overdue' },
        }
      );
    }
  } catch (err) {
    console.error('Error syncing overdue status:', err.message);
  }
};

// @desc    Get all loans (with member info populated)
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res, next) => {
  try {
    await syncOverdueStatus();
    const loans = await Loan.findAll({
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'fullName', 'village', 'idNumber'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Flatten for frontend compatibility
    const result = loans.map((l) => ({
      _id:                l.id,
      id:                 l.id,
      memberId:           l.member ? l.member.id : l.memberId,
      memberName:         l.member ? l.member.fullName : 'Unknown',
      memberVillage:      l.member ? l.member.village : '',
      loanAmount:         parseFloat(l.loanAmount),
      interestRate:       parseFloat(l.interestRate),
      loanDuration:       l.loanDuration,
      startDate:          l.startDate,
      monthlyInstallment: parseFloat(l.monthlyInstallment),
      totalRepayable:     parseFloat(l.totalRepayable),
      paidAmount:         parseFloat(l.paidAmount),
      remainingBalance:   parseFloat(l.remainingBalance),
      status:             l.status,
      grantedAt:          l.createdAt,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Simple in-memory cache for dashboard stats (30-second TTL)
let statsCache = null;
let statsCacheExpiry = 0;

const invalidateStatsCache = () => {
  statsCache = null;
  statsCacheExpiry = 0;
};

// @desc    Get dashboard stats
// @route   GET /api/loans/stats
// @access  Private
const getStats = async (req, res, next) => {
  try {
    const nowMs = Date.now();
    if (statsCache && nowMs < statsCacheExpiry) {
      return res.json(statsCache);
    }

    await syncOverdueStatus();

    const [totalMembers, loans] = await Promise.all([
      Member.count(),
      Loan.findAll(),
    ]);

    const activeLoans         = loans.filter(l => l.status === 'active').length;
    const overdueLoans        = loans.filter(l => l.status === 'overdue').length;
    const totalAmountLent     = loans.reduce((s, l) => s + parseFloat(l.loanAmount || 0), 0);
    const totalReceivedAmount = loans.reduce((s, l) => s + parseFloat(l.paidAmount || 0), 0);

    // Pending payments this month
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const pendingPayments = await Payment.count({
      where: {
        status:  'pending',
        dueDate: { [Op.between]: [startOfMonth, endOfMonth] },
      },
    });

    const collectedSum = await Payment.sum('amountPaid', {
      where: {
        status: 'paid',
        paidAt: { [Op.between]: [startOfMonth, endOfMonth] },
      },
    });
    const collectedThisMonth = collectedSum || 0;

    // Recent activity — last 5 paid payments
    const recentPayments = await Payment.findAll({
      where: { status: 'paid' },
      order: [['paidAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: Loan,
          as: 'loan',
          include: [
            {
              model: Member,
              as: 'member',
              attributes: ['id', 'fullName'],
            },
          ],
        },
      ],
    });

    const recentActivity = recentPayments.map((p) => ({
      id:     p.id,
      _id:    p.id,
      type:   'payment',
      member: p.loan?.member?.fullName || 'Unknown',
      amount: parseFloat(p.amountPaid),
      date:   p.paidAt,
      note:   `Week ${p.monthNumber} payment`,
    }));

    const responseData = {
      totalMembers,
      activeLoans,
      overdueLoans,
      totalAmountLent,
      totalReceivedAmount,
      totalAmountReceived: totalReceivedAmount,
      pendingPayments,
      collectedThisMonth,
      recentActivity,
    };

    // Store in cache with 30-second TTL
    statsCache = responseData;
    statsCacheExpiry = Date.now() + 30 * 1000;

    res.json(responseData);
  } catch (err) {
    next(err);
  }
};

// @desc    Grant a loan (auto-generates payment schedule)
// @route   POST /api/loans
// @access  Private
const createLoan = async (req, res, next) => {
  try {
    const { memberId, loanAmount, interestRate, loanDuration, startDate } = req.body;

    const parsedMemberId = parseInt(memberId, 10);
    if (!memberId || isNaN(parsedMemberId)) {
      return res.status(400).json({ message: 'A valid member ID is required' });
    }

    const member = await Member.findByPk(parsedMemberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const amount   = parseFloat(loanAmount);
    const rate     = interestRate !== undefined && interestRate !== '' ? parseFloat(interestRate) : 30;
    const duration = parseInt(loanDuration, 10);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Loan amount must be a positive number' });
    }

    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'Interest rate must be between 0% and 100%' });
    }

    if (isNaN(duration) || duration < 1 || duration > 520) {
      return res.status(400).json({ message: 'Loan duration must be between 1 and 520 weeks' });
    }

    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ message: 'A valid start date is required' });
    }

    const totalRepayable     = Math.round(amount * (1 + rate / 100));
    const monthlyInstallment = Math.round(totalRepayable / duration);

    const loan = await sequelize.transaction(async (t) => {
      const createdLoan = await Loan.create({
        memberId:           parsedMemberId,
        loanAmount:         amount,
        interestRate:       rate,
        loanDuration:       duration,
        startDate:          parsedStartDate,
        monthlyInstallment,
        totalRepayable,
        paidAmount:         0,
        remainingBalance:   totalRepayable,
        status:             'active',
        createdBy:          req.user.id || req.user._id,
      }, { transaction: t });

      // Auto-generate weekly payment schedule
      const schedule = generateSchedule(createdLoan.id, parsedStartDate, monthlyInstallment, duration);
      await Payment.bulkCreate(schedule, { transaction: t });

      return createdLoan;
    });

    invalidateStatsCache();

    res.status(201).json({
      ...loan.toJSON(),
      memberName: member.fullName,
      memberVillage: member.village,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a loan and its payment schedule
// @route   DELETE /api/loans/:id
// @access  Private
const deleteLoan = async (req, res, next) => {
  try {
    const loanId = parseInt(req.params.id, 10);
    if (isNaN(loanId)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }

    const loan = await Loan.findByPk(loanId);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    // Financial audit guard: do not allow hard deletion of loans with collected payments
    if (parseFloat(loan.paidAmount) > 0) {
      return res.status(400).json({
        message: 'Cannot delete a loan that has recorded payment transactions. Mark it as completed or adjust payments first.',
      });
    }

    await sequelize.transaction(async (t) => {
      await Payment.destroy({ where: { loanId: loan.id }, transaction: t });
      await loan.destroy({ transaction: t });
    });

    invalidateStatsCache();

    res.json({ message: 'Loan and payment schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLoans, getStats, createLoan, deleteLoan, invalidateStatsCache };


