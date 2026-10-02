const { Op, QueryTypes } = require('sequelize');
const { sequelize, Loan, Member, Payment } = require('../models');
const { buildSchedule, toCents } = require('../services/loanMath');
const { todayLocal, monthRange, startOfWeek, addDays, localMidnight, toLocalDateString } = require('../utils/dates');
const httpError = require('../utils/httpError');
const { pagingFrom, pageResult } = require('../utils/paging');

// Payments that are real cash events: auto-paid rows only mirror part of another row's cash (B5)
const CASH_RECEIPTS = `p.status = 'paid' AND (p.isAutoPaid = 0 OR p.isAutoPaid IS NULL)`;

// Ids of loans with an open installment whose due date has passed: read-time "overdue" (B13)
const findPastDueLoanIds = async (today) => {
  const rows = await sequelize.query(
    `SELECT DISTINCT loanId FROM Payments WHERE status IN ('pending', 'overdue') AND dueDate < :today`,
    { replacements: { today }, type: QueryTypes.SELECT },
  );
  return new Set(rows.map((r) => r.loanId));
};

// Completed only when nothing is owed (B12); otherwise overdue or active from today's date
const loanStatus = (loan, pastDueIds) => {
  if (toCents(loan.remainingBalance) <= 0) return 'completed';
  return pastDueIds.has(loan.id) ? 'overdue' : 'active';
};

// @desc    Get all loans (with member info populated)
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res, next) => {
  try {
    const [loans, pastDueIds] = await Promise.all([
      Loan.findAll({
        include: [
          {
            model: Member,
            as: 'member',
            attributes: ['id', 'fullName', 'village', 'idNumber'],
          },
        ],
        order: [['createdAt', 'DESC']],
      }),
      findPastDueLoanIds(todayLocal()),
    ]);

    // Flatten for frontend compatibility
    let result = loans.map((l) => ({
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
      status:             loanStatus(l, pastDueIds),
      grantedAt:          l.createdAt,
    }));

    // ?q= searches member name, NIC and village. Filtering happens here, after the status is
    // worked out, so "overdue" means exactly what the rest of the app shows.
    const { q, status } = req.valid.query;
    if (q) {
      const needle = q.toLowerCase();
      const nicOf = new Map(loans.map((l) => [l.id, l.member ? l.member.idNumber || '' : '']));
      result = result.filter((l) =>
        [l.memberName, l.memberVillage, nicOf.get(l.id)].some((v) => String(v || '').toLowerCase().includes(needle)));
    }

    const paging = pagingFrom(req.valid.query);
    if (!paging) {
      return res.json(status && status !== 'all' ? result.filter((l) => l.status === status) : result);
    }

    // Paged: the unit is a MEMBER (the Loan Details page shows each member's loans together), so a
    // member's loans never split across two pages. `total` counts members; `counts` feeds the tabs.
    const counts = { all: result.length, active: 0, completed: 0, overdue: 0 };
    for (const l of result) counts[l.status] = (counts[l.status] || 0) + 1;
    if (status && status !== 'all') result = result.filter((l) => l.status === status);

    const memberOrder = [...new Set(result.map((l) => l.memberId))]; // newest loan first
    const onPage = new Set(memberOrder.slice(paging.offset, paging.offset + paging.limit));
    res.json(pageResult(result.filter((l) => onPage.has(l.memberId)), memberOrder.length, paging, { counts }));
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

    const today = todayLocal();
    const month = monthRange();
    const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    const [totalMembers, [loanTotals], [due], [collected], recentPayments] = await Promise.all([
      Member.count(),
      // Same status rule as getLoans, so the dashboard and the loans list always agree
      select(`
        SELECT
          COALESCE(SUM(l.loanAmount), 0) AS totalAmountLent,
          COALESCE(SUM(l.paidAmount), 0) AS totalReceivedAmount,
          COALESCE(SUM(l.remainingBalance > 0 AND od.loanId IS NULL), 0) AS activeLoans,
          COALESCE(SUM(l.remainingBalance > 0 AND od.loanId IS NOT NULL), 0) AS overdueLoans
        FROM Loans l
        LEFT JOIN (SELECT DISTINCT loanId FROM Payments
                   WHERE status IN ('pending', 'overdue') AND dueDate < :today) od ON od.loanId = l.id
        WHERE l.deletedAt IS NULL`, { today }),
      // B14: installments due this month that are still unpaid, whether or not already flagged overdue
      select(`
        SELECT COUNT(*) AS pendingPayments
        FROM Payments p JOIN Loans l ON l.id = p.loanId AND l.deletedAt IS NULL
        WHERE p.status IN ('pending', 'overdue') AND p.dueDate BETWEEN :firstDay AND :lastDay`,
      { firstDay: month.firstDay, lastDay: month.lastDay }),
      // B5: cash actually received this month
      select(`
        SELECT COALESCE(SUM(p.amountPaid), 0) AS collectedThisMonth
        FROM Payments p JOIN Loans l ON l.id = p.loanId AND l.deletedAt IS NULL
        WHERE ${CASH_RECEIPTS} AND p.paidAt >= :start AND p.paidAt < :end`,
      { start: month.start, end: month.end }),
      Payment.findAll({
        where: { status: 'paid', isAutoPaid: { [Op.not]: true } }, // NULL on rows older than the column
        order: [['paidAt', 'DESC']],
        limit: 5,
        include: [
          {
            model: Loan,
            as: 'loan',
            required: true, // skips deleted loans
            include: [
              {
                model: Member,
                as: 'member',
                attributes: ['id', 'fullName'],
              },
            ],
          },
        ],
      }),
    ]);

    const recentActivity = recentPayments.map((p) => ({
      id:     p.id,
      _id:    p.id,
      type:   'payment',
      member: p.loan?.member?.fullName || 'Unknown',
      amount: parseFloat(p.amountPaid),
      date:   p.paidAt,
      note:   `Week ${p.monthNumber} payment`,
    }));

    const totalReceivedAmount = Number(loanTotals.totalReceivedAmount);
    const responseData = {
      totalMembers,
      activeLoans:         Number(loanTotals.activeLoans),
      overdueLoans:        Number(loanTotals.overdueLoans),
      totalAmountLent:     Number(loanTotals.totalAmountLent),
      totalReceivedAmount,
      totalAmountReceived: totalReceivedAmount,
      pendingPayments:     Number(due.pendingPayments),
      collectedThisMonth:  Number(collected.collectedThisMonth),
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

// @desc    Cash collected per week (Monday to Sunday, local time) for the dashboard chart (B15)
// @route   GET /api/loans/collections?weeks=8
// @access  Private
const getCollections = async (req, res, next) => {
  try {
    const { weeks } = req.valid.query;
    const thisWeek  = startOfWeek(todayLocal());
    const firstWeek = addDays(thisWeek, -7 * (weeks - 1));

    const receipts = await sequelize.query(`
      SELECT p.paidAt, p.amountPaid
      FROM Payments p JOIN Loans l ON l.id = p.loanId AND l.deletedAt IS NULL
      WHERE ${CASH_RECEIPTS} AND p.paidAt >= :from`,
    { replacements: { from: localMidnight(firstWeek) }, type: QueryTypes.SELECT });

    const buckets = Array.from({ length: weeks }, (_, i) => ({ weekStart: addDays(firstWeek, 7 * i), cents: 0 }));
    const byWeek = new Map(buckets.map((b) => [b.weekStart, b]));
    for (const r of receipts) {
      const bucket = byWeek.get(startOfWeek(toLocalDateString(new Date(r.paidAt))));
      if (bucket) bucket.cents += toCents(r.amountPaid);
    }

    res.json(buckets.map((b) => ({ weekStart: b.weekStart, amount: b.cents / 100 })));
  } catch (err) {
    next(err);
  }
};

// @desc    Grant a loan (auto-generates payment schedule)
// @route   POST /api/loans
// @access  Private
const createLoan = async (req, res, next) => {
  try {
    const { memberId, loanAmount, interestRate, loanDuration, startDate } = req.valid.body;

    const member = await Member.findByPk(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const totalRepayable     = Math.round(loanAmount * (1 + interestRate / 100));
    const monthlyInstallment = Math.round(totalRepayable / loanDuration); // typical week, for display
    if (totalRepayable < loanDuration) {
      return res.status(400).json({ message: 'The loan amount is too small to repay over that many weeks' });
    }

    if (req.inFlight) req.inFlight.stage = 'loan-transaction';
    const loan = await sequelize.transaction(async (t) => {
      const createdLoan = await Loan.create({
        memberId,
        loanAmount,
        interestRate,
        loanDuration,
        startDate,
        monthlyInstallment,
        totalRepayable,
        paidAmount:         0,
        remainingBalance:   totalRepayable,
        status:             'active',
        createdBy:          req.user.id,
      }, { transaction: t });

      // B10: installments split exactly so the schedule adds up to totalRepayable
      const schedule = buildSchedule({ loanId: createdLoan.id, startDate, totalRepayable, weeks: loanDuration });
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

// @desc    Delete a loan. Soft delete: the loan disappears from lists and totals, but the row and its
//          payment history are kept for audit (7-year retention) with who deleted it and why.
// @route   DELETE /api/loans/:id?reason=...
//          (The reason is a query parameter: some WAF configs drop DELETE requests with a body.)
// @access  Private (admin)
const deleteLoan = async (req, res, next) => {
  try {
    const { id } = req.valid.params;
    const { reason } = req.valid.query;

    await sequelize.transaction(async (t) => {
      const loan = await Loan.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!loan) throw httpError(404, 'Loan not found');
      await loan.update({ deletedBy: req.user.id, deleteReason: reason }, { transaction: t });
      await loan.destroy({ transaction: t });
    });

    console.info(`[audit] loan deleted: loan=${id} by=${req.user.id} reason=${JSON.stringify(reason)}`);
    invalidateStatsCache();

    res.json({ message: 'Loan deleted. Its payment history is kept for audit.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLoans, getStats, getCollections, createLoan, deleteLoan, invalidateStatsCache };
