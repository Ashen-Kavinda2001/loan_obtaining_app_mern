const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Loan = sequelize.define('Loan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('id');
    },
  },
  memberId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  loanAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  interestRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 30.00,
  },
  loanDuration: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  monthlyInstallment: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  totalRepayable: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  remainingBalance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'overdue', 'completed'),
    defaultValue: 'active',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  timestamps: true,
});

Loan.prototype.toJSON = function () {
  const values = { ...this.get() };
  values._id = values.id;
  values.loanAmount = parseFloat(values.loanAmount || 0);
  values.interestRate = parseFloat(values.interestRate || 0);
  values.monthlyInstallment = parseFloat(values.monthlyInstallment || 0);
  values.totalRepayable = parseFloat(values.totalRepayable || 0);
  values.paidAmount = parseFloat(values.paidAmount || 0);
  values.remainingBalance = parseFloat(values.remainingBalance || 0);
  return values;
};

module.exports = Loan;
