/**
 * seed.js — Populates MySQL with demo data for testing.
 * Run with:  npm run seed   (inside /server)
 */
require('dotenv').config();
const { sequelize, User, Member, Loan, Payment, Group, PasswordReset } = require('./models');

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

  // ── Helper: generate payment schedule ───────────────────
  const makeSchedule = (loanId, startDate, monthly, duration) => {
    const payments = [];
    const start = new Date(startDate);
    for (let i = 1; i <= duration; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      payments.push({ loanId, monthNumber: i, amountDue: monthly, amountPaid: 0, dueDate: due, paidAt: null, status: 'pending' });
    }
    return payments;
  };

  // ── Loan 1 — Kamal Perera (active, 4 paid) ──────────────
  const loan1 = await Loan.create({
    memberId: members[0].id, loanAmount: 50000, interestRate: 30, loanDuration: 12,
    startDate: '2025-02-01', monthlyInstallment: 5417, totalRepayable: 65000,
    paidAmount: 21668, remainingBalance: 43332, status: 'active', createdBy: admin.id,
  });
  const p1 = makeSchedule(loan1.id, '2025-02-01', 5417, 12);
  p1[0] = { ...p1[0], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-03-05') };
  p1[1] = { ...p1[1], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-04-03') };
  p1[2] = { ...p1[2], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-05-02') };
  p1[3] = { ...p1[3], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-06-04') };
  await Payment.bulkCreate(p1);

  // ── Loan 2 — Nimal Silva (completed) ────────────────────
  const loan2 = await Loan.create({
    memberId: members[1].id, loanAmount: 30000, interestRate: 30, loanDuration: 6,
    startDate: '2025-01-15', monthlyInstallment: 6500, totalRepayable: 39000,
    paidAmount: 39000, remainingBalance: 0, status: 'completed', createdBy: admin.id,
  });
  const p2 = makeSchedule(loan2.id, '2025-01-15', 6500, 6);
  const p2Paid = p2.map((p, i) => {
    const d = new Date('2025-01-15');
    d.setMonth(d.getMonth() + i + 1);
    return { ...p, status: 'paid', amountPaid: 6500, paidAt: d };
  });
  await Payment.bulkCreate(p2Paid);

  // ── Loan 3 — Sunil Fernando (overdue) ───────────────────
  const loan3 = await Loan.create({
    memberId: members[2].id, loanAmount: 75000, interestRate: 30, loanDuration: 18,
    startDate: '2025-01-01', monthlyInstallment: 5417, totalRepayable: 97500,
    paidAmount: 10834, remainingBalance: 86666, status: 'overdue', createdBy: admin.id,
  });
  const p3 = makeSchedule(loan3.id, '2025-01-01', 5417, 18);
  p3[0] = { ...p3[0], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-02-05') };
  p3[1] = { ...p3[1], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-03-04') };
  p3[2] = { ...p3[2], status: 'overdue' };
  await Payment.bulkCreate(p3);

  // ── Loan 4 — Anura Bandara (active) ─────────────────────
  const loan4 = await Loan.create({
    memberId: members[3].id, loanAmount: 20000, interestRate: 30, loanDuration: 6,
    startDate: '2025-03-01', monthlyInstallment: 4333, totalRepayable: 26000,
    paidAmount: 8666, remainingBalance: 17334, status: 'active', createdBy: admin.id,
  });
  const p4 = makeSchedule(loan4.id, '2025-03-01', 4333, 6);
  p4[0] = { ...p4[0], status: 'paid', amountPaid: 4333, paidAt: new Date('2025-04-03') };
  p4[1] = { ...p4[1], status: 'paid', amountPaid: 4333, paidAt: new Date('2025-05-02') };
  await Payment.bulkCreate(p4);

  // ── Loan 5 — Chamara Wickrama (active) ──────────────────
  const loan5 = await Loan.create({
    memberId: members[4].id, loanAmount: 40000, interestRate: 30, loanDuration: 10,
    startDate: '2025-04-01', monthlyInstallment: 5200, totalRepayable: 52000,
    paidAmount: 5200, remainingBalance: 46800, status: 'active', createdBy: admin.id,
  });
  const p5 = makeSchedule(loan5.id, '2025-04-01', 5200, 10);
  p5[0] = { ...p5[0], status: 'paid', amountPaid: 5200, paidAt: new Date('2025-05-05') };
  await Payment.bulkCreate(p5);

  console.log('💳 5 loans + payment schedules created');
  console.log('\n✅ Seed complete! You can now start the server.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

