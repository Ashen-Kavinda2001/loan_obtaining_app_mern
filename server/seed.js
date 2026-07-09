/**
 * seed.js — Populates MongoDB with demo data for testing.
 * Run with:  npm run seed   (inside /server)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const connectDB = require('./config/db');
const User      = require('./models/User');
const Member    = require('./models/Member');
const Loan      = require('./models/Loan');
const Payment   = require('./models/Payment');

const seed = async () => {
  await connectDB();

  // ── Wipe existing data ──────────────────────────────────
  await Promise.all([
    User.deleteMany(),
    Member.deleteMany(),
    Loan.deleteMany(),
    Payment.deleteMany(),
  ]);
  console.log('🗑️  Cleared existing data');

  // ── Admin user ──────────────────────────────────────────
  await User.create({ email: 'admin@example.com', password: 'admin123' });
  console.log('👤 Admin user created: admin@example.com / admin123');

  // ── Members ─────────────────────────────────────────────
  const members = await Member.insertMany([
    { fullName: 'Kamal Perera',     idNumber: '199012345678', village: 'Matara',     contactNumber: '077-123-4567', age: 34 },
    { fullName: 'Nimal Silva',      idNumber: '198876543210', village: 'Galle',      contactNumber: '071-234-5678', age: 36 },
    { fullName: 'Sunil Fernando',   idNumber: '200198765432', village: 'Colombo',    contactNumber: '076-345-6789', age: 24 },
    { fullName: 'Anura Bandara',    idNumber: '197654321098', village: 'Kandy',      contactNumber: '072-456-7890', age: 49 },
    { fullName: 'Chamara Wickrama', idNumber: '199812345670', village: 'Kurunegala', contactNumber: '078-567-8901', age: 27 },
    { fullName: 'Ruwan Jayasinghe', idNumber: '196543210987', village: 'Matara',     contactNumber: '075-678-9012', age: 59 },
  ]);
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
    memberId: members[0]._id, loanAmount: 50000, interestRate: 30, loanDuration: 12,
    startDate: '2025-02-01', monthlyInstallment: 5417, totalRepayable: 65000,
    paidAmount: 21668, remainingBalance: 43332, status: 'active',
  });
  const p1 = makeSchedule(loan1._id, '2025-02-01', 5417, 12);
  p1[0] = { ...p1[0], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-03-05') };
  p1[1] = { ...p1[1], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-04-03') };
  p1[2] = { ...p1[2], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-05-02') };
  p1[3] = { ...p1[3], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-06-04') };
  await Payment.insertMany(p1);

  // ── Loan 2 — Nimal Silva (completed) ────────────────────
  const loan2 = await Loan.create({
    memberId: members[1]._id, loanAmount: 30000, interestRate: 30, loanDuration: 6,
    startDate: '2025-01-15', monthlyInstallment: 6500, totalRepayable: 39000,
    paidAmount: 39000, remainingBalance: 0, status: 'completed',
  });
  const p2 = makeSchedule(loan2._id, '2025-01-15', 6500, 6);
  const p2Paid = p2.map((p, i) => ({
    ...p, status: 'paid', amountPaid: 6500,
    paidAt: new Date(new Date('2025-01-15').setMonth(new Date('2025-01-15').getMonth() + i + 1)),
  }));
  await Payment.insertMany(p2Paid);

  // ── Loan 3 — Sunil Fernando (overdue) ───────────────────
  const loan3 = await Loan.create({
    memberId: members[2]._id, loanAmount: 75000, interestRate: 30, loanDuration: 18,
    startDate: '2025-01-01', monthlyInstallment: 5417, totalRepayable: 97500,
    paidAmount: 10834, remainingBalance: 86666, status: 'overdue',
  });
  const p3 = makeSchedule(loan3._id, '2025-01-01', 5417, 18);
  p3[0] = { ...p3[0], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-02-05') };
  p3[1] = { ...p3[1], status: 'paid', amountPaid: 5417, paidAt: new Date('2025-03-04') };
  p3[2] = { ...p3[2], status: 'overdue' };
  await Payment.insertMany(p3);

  // ── Loan 4 — Anura Bandara (active) ─────────────────────
  const loan4 = await Loan.create({
    memberId: members[3]._id, loanAmount: 20000, interestRate: 30, loanDuration: 6,
    startDate: '2025-03-01', monthlyInstallment: 4333, totalRepayable: 26000,
    paidAmount: 8666, remainingBalance: 17334, status: 'active',
  });
  const p4 = makeSchedule(loan4._id, '2025-03-01', 4333, 6);
  p4[0] = { ...p4[0], status: 'paid', amountPaid: 4333, paidAt: new Date('2025-04-03') };
  p4[1] = { ...p4[1], status: 'paid', amountPaid: 4333, paidAt: new Date('2025-05-02') };
  await Payment.insertMany(p4);

  // ── Loan 5 — Chamara Wickrama (active) ──────────────────
  const loan5 = await Loan.create({
    memberId: members[4]._id, loanAmount: 40000, interestRate: 30, loanDuration: 10,
    startDate: '2025-04-01', monthlyInstallment: 5200, totalRepayable: 52000,
    paidAmount: 5200, remainingBalance: 46800, status: 'active',
  });
  const p5 = makeSchedule(loan5._id, '2025-04-01', 5200, 10);
  p5[0] = { ...p5[0], status: 'paid', amountPaid: 5200, paidAt: new Date('2025-05-05') };
  await Payment.insertMany(p5);

  console.log('💳 5 loans + payment schedules created');
  console.log('\n✅ Seed complete! You can now start the server.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
