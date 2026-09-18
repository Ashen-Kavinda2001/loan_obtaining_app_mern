const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
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
  loanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  monthNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amountDue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  amountPaid: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue'),
    defaultValue: 'pending',
  },
  isPartial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isAutoPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

Payment.prototype.toJSON = function () {
  const values = { ...this.get() };
  values._id = values.id;
  values.amountDue = parseFloat(values.amountDue || 0);
  values.amountPaid = parseFloat(values.amountPaid || 0);
  return values;
};

module.exports = Payment;
