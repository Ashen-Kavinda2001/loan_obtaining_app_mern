// ============================================================
//  DEMO DATA — Replace with real API calls later
// ============================================================

export const demoMembers = [
  { _id: 'm1', fullName: 'Kamal Perera',     idNumber: '199012345678', village: 'Matara',    contactNumber: '077-123-4567', age: 34, createdAt: '2025-01-10' },
  { _id: 'm2', fullName: 'Nimal Silva',      idNumber: '198876543210', village: 'Galle',     contactNumber: '071-234-5678', age: 36, createdAt: '2025-01-15' },
  { _id: 'm3', fullName: 'Sunil Fernando',   idNumber: '200198765432', village: 'Colombo',   contactNumber: '076-345-6789', age: 24, createdAt: '2025-02-05' },
  { _id: 'm4', fullName: 'Anura Bandara',    idNumber: '197654321098', village: 'Kandy',     contactNumber: '072-456-7890', age: 49, createdAt: '2025-02-18' },
  { _id: 'm5', fullName: 'Chamara Wickrama', idNumber: '199812345670', village: 'Kurunegala',contactNumber: '078-567-8901', age: 27, createdAt: '2025-03-01' },
  { _id: 'm6', fullName: 'Ruwan Jayasinghe', idNumber: '196543210987', village: 'Matara',    contactNumber: '075-678-9012', age: 59, createdAt: '2025-03-12' },
];

export const demoLoans = [
  {
    _id: 'l1', memberId: 'm1', memberName: 'Kamal Perera', memberVillage: 'Matara',
    loanAmount: 50000, interestRate: 30, loanDuration: 12,
    startDate: '2025-02-01', monthlyInstallment: 5417, totalRepayable: 65000,
    paidAmount: 21667, remainingBalance: 43333, status: 'active', grantedAt: '2025-02-01',
  },
  {
    _id: 'l2', memberId: 'm2', memberName: 'Nimal Silva', memberVillage: 'Galle',
    loanAmount: 30000, interestRate: 30, loanDuration: 6,
    startDate: '2025-01-15', monthlyInstallment: 6500, totalRepayable: 39000,
    paidAmount: 39000, remainingBalance: 0, status: 'completed', grantedAt: '2025-01-15',
  },
  {
    _id: 'l3', memberId: 'm3', memberName: 'Sunil Fernando', memberVillage: 'Colombo',
    loanAmount: 75000, interestRate: 30, loanDuration: 18,
    startDate: '2025-01-01', monthlyInstallment: 5417, totalRepayable: 97500,
    paidAmount: 10833, remainingBalance: 86667, status: 'overdue', grantedAt: '2025-01-01',
  },
  {
    _id: 'l4', memberId: 'm4', memberName: 'Anura Bandara', memberVillage: 'Kandy',
    loanAmount: 20000, interestRate: 30, loanDuration: 6,
    startDate: '2025-03-01', monthlyInstallment: 4333, totalRepayable: 26000,
    paidAmount: 8667, remainingBalance: 17333, status: 'active', grantedAt: '2025-03-01',
  },
  {
    _id: 'l5', memberId: 'm5', memberName: 'Chamara Wickrama', memberVillage: 'Kurunegala',
    loanAmount: 40000, interestRate: 30, loanDuration: 10,
    startDate: '2025-04-01', monthlyInstallment: 5200, totalRepayable: 52000,
    paidAmount: 5200, remainingBalance: 46800, status: 'active', grantedAt: '2025-04-01',
  },
];

export const demoPayments = [
  { _id: 'p1', loanId: 'l1', monthNumber: 1, amountDue: 5417, amountPaid: 5417, dueDate: '2025-03-01', paidAt: '2025-03-01', status: 'paid' },
  { _id: 'p2', loanId: 'l1', monthNumber: 2, amountDue: 5417, amountPaid: 5417, dueDate: '2025-04-01', paidAt: '2025-04-01', status: 'paid' },
  { _id: 'p3', loanId: 'l1', monthNumber: 3, amountDue: 5417, amountPaid: 5417, dueDate: '2025-05-01', paidAt: '2025-05-01', status: 'paid' },
  { _id: 'p4', loanId: 'l1', monthNumber: 4, amountDue: 5417, amountPaid: 5417, dueDate: '2025-06-01', paidAt: '2025-06-01', status: 'paid' },
  { _id: 'p5', loanId: 'l1', monthNumber: 5, amountDue: 5417, amountPaid: 0,    dueDate: '2025-07-01', paidAt: null,          status: 'pending' },
  { _id: 'p6', loanId: 'l1', monthNumber: 6, amountDue: 5417, amountPaid: 0,    dueDate: '2025-08-01', paidAt: null,          status: 'pending' },
];

export const dashboardStats = {
  totalMembers: 6,
  activeLoans: 3,
  totalAmountLent: 215000,
  pendingPayments: 8,
  collectedThisMonth: 16250,
  overdueLoans: 1,
};

export const recentActivity = [
  { id: 1, type: 'payment',  member: 'Kamal Perera',     amount: 5417,  date: '2026-05-12', note: 'Month 4 payment' },
  { id: 2, type: 'loan',     member: 'Chamara Wickrama', amount: 40000, date: '2026-05-10', note: 'New loan granted' },
  { id: 3, type: 'payment',  member: 'Anura Bandara',    amount: 4333,  date: '2026-05-08', note: 'Month 2 payment' },
  { id: 4, type: 'loan',     member: 'Anura Bandara',    amount: 20000, date: '2026-05-01', note: 'New loan granted' },
  { id: 5, type: 'complete', member: 'Nimal Silva',      amount: 39000, date: '2026-04-28', note: 'Loan fully repaid' },
];

// Helper: format currency in Rs.
export const formatCurrency = (val) =>
  `Rs. ${Number(val).toLocaleString('en-LK')}`;

// Helper: status badge class
export const statusClass = (status) => `badge badge-${status}`;
