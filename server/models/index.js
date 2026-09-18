const { sequelize } = require('../config/db');
const User = require('./User');
const Group = require('./Group');
const Member = require('./Member');
const Loan = require('./Loan');
const Payment = require('./Payment');
const PasswordReset = require('./PasswordReset');

// ── Relationships ─────────────────────────────────────────

// Group <-> Member
Group.hasMany(Member, { foreignKey: 'groupId', as: 'members', onDelete: 'SET NULL' });
Member.belongsTo(Group, { foreignKey: 'groupId', as: 'groupDetails' });

// User <-> Member (audit trail)
User.hasMany(Member, { foreignKey: 'createdBy', as: 'createdMembers' });
Member.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Member <-> Loan
Member.hasMany(Loan, { foreignKey: 'memberId', as: 'loans', onDelete: 'RESTRICT' });
Loan.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

// User <-> Loan (audit trail)
User.hasMany(Loan, { foreignKey: 'createdBy', as: 'createdLoans' });
Loan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Loan <-> Payment
Loan.hasMany(Payment, { foreignKey: 'loanId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Loan, { foreignKey: 'loanId', as: 'loan' });

// Member toJSON customization to preserve MongoDB populate compatibility
Member.prototype.toJSON = function () {
  const values = { ...this.get() };
  values._id = values.id;
  if (this.groupDetails) {
    values.groupId = {
      id: this.groupDetails.id,
      _id: this.groupDetails.id,
      name: this.groupDetails.name,
    };
  }
  return values;
};

module.exports = {
  sequelize,
  User,
  Group,
  Member,
  Loan,
  Payment,
  PasswordReset,
};
