/**
 * seed.js — Populates MySQL with demo data for testing.
 * Run with:  npm run seed   (inside /server)
 */
require('dotenv').config();
require('./config/timezone');
const { sequelize, User, Member, Loan, Payment, Group, PasswordReset } = require('./models');
const { buildSchedule, deriveLoanStatus } = require('./services/loanMath');
const { todayLocal, addDays, localMidnight } = require('./utils/dates');

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ FATAL: seed.js is strictly prohibited in production environments!');
    process.exit(1);
  }

  await sequelize.authenticate();
  await sequelize.sync();

  // ── Idempotency check: skip if data already exists ──────
  const existingUser = await User.findOne({ where: { email: 'admin@example.com' } });
  if (existingUser) {
    console.log('✅ Database already seeded. Skipping seed.');
    process.exit(0);
  }

  // ── Wipe existing data (only runs on first seed) ────────
  await Payment.destroy({ where: {}, force: true });
  await Loan.destroy({ where: {}, force: true });
  await Member.destroy({ where: {}, force: true });
  await Group.destroy({ where: {}, force: true });
  await PasswordReset.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
  console.log('🗑️  Cleared existing data');

  // ── Admin user ──────────────────────────────────────────
  const admin = await User.create({ email: 'admin@example.com', password: 'admin123' });
  console.log('👤 Admin user created: admin@example.com / admin123');

  // ── Members ─────────────────────────────────────────────
  const membersData = [
    { fullName: 'Kamal Perera',     idNumber: '199012345678', village: 'Matara',     contactNumber: '077-123-4567', age: 34, createdBy: admin.id },
    { fullName: 'Nimal Silva',      idNumber: '198876543210', village: 'Galle',      contactNumber: '071-234-5678', age: 36, createdBy: admin.id },
    { fullName: 'Sunil Fernando',   idNumber: '200198765432', village: 'Colombo',    contactNumber: '076-345-6789', age: 24, createdBy: admin.id },
    { fullName: 'Anura Bandara',    idNumber: '197654321098', village: 'Kandy',      contactNumber: '072-456-7890', age: 49, createdBy: admin.id },
    { fullName: 'Chamara Wickrama', idNumber: '199812345670', village: 'Kurunegala', contactNumber: '078-567-8901', age: 27, createdBy: admin.id },
    { fullName: 'Ruwan Jayasinghe', idNumber: '196543210987', village: 'Matara',     contactNumber: '075-678-9012', age: 59, createdBy: admin.id },
  ];

  const members = [];
  for (const m of membersData) {
    const created = await Member.create(m);
    members.push(created);
  }
  console.log(`👥 ${members.length} members created`);

  // ── Loans: weekly schedules built exactly like the app does (services/loanMath) ──
  // Start dates are relative to today, so the demo always has paid, due and overdue weeks.
  const today = todayLocal();
  const makeLoan = async ({ member, loanAmount, weeks, startedWeeksAgo, paidWeeks, interestRate = 30 }) => {
    const totalRepayable = loanAmount * (1 + interestRate / 100);
    const startDate = addDays(today, -7 * startedWeeksAgo);
    const rows = buildSchedule({ loanId: null, startDate, totalRepayable, weeks });
    const loan = await Loan.create({
      memberId: member.id, loanAmount, interestRate, loanDuration: weeks, startDate,
      monthlyInstallment: rows[0].amountDue, totalRepayable, paidAmount: 0, remainingBalance: totalRepayable,
      status: 'active', createdBy: admin.id,
    });
    const payments = rows.map((r, i) => {
      const paid = i < paidWeeks;
      return {
        ...r, loanId: loan.id,
        status: paid ? 'paid' : (r.dueDate < today ? 'overdue' : 'pending'),
        amountPaid: paid ? r.amountDue : 0,
        paidAt: paid ? localMidnight(r.dueDate) : null,
      };
    });
    await Payment.bulkCreate(payments);
    const paidAmount = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amountPaid, 0);
    const remainingBalance = totalRepayable - paidAmount;
    await loan.update({ paidAmount, remainingBalance, status: deriveLoanStatus({ remainingBalance, rows: payments, today }) });
  };

  await makeLoan({ member: members[0], loanAmount: 50000, weeks: 12, startedWeeksAgo: 4, paidWeeks: 4 });  // active, up to date
  await makeLoan({ member: members[1], loanAmount: 30000, weeks: 6,  startedWeeksAgo: 8, paidWeeks: 6 });  // completed
  await makeLoan({ member: members[2], loanAmount: 75000, weeks: 18, startedWeeksAgo: 6, paidWeeks: 2 });  // overdue
  await makeLoan({ member: members[3], loanAmount: 20000, weeks: 6,  startedWeeksAgo: 2, paidWeeks: 2 });  // active
  await makeLoan({ member: members[4], loanAmount: 40000, weeks: 10, startedWeeksAgo: 1, paidWeeks: 1 });  // active

  console.log('💳 5 loans + payment schedules created');
  console.log('\n✅ Seed complete! You can now start the server.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

