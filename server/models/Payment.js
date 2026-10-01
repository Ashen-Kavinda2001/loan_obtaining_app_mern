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
  // Audit: who recorded the payment on this row, and who last reverted one
  recordedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reversedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reversedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Client-generated key for the request that recorded this payment; a repeat returns the original result
  idempotencyKey: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  // JSON written by services/loanMath.buildCascadeLog so the payment can be reverted exactly.
  // MEDIUMTEXT: paying off a 520-week loan at once snapshots every row (~60 KB, near TEXT's 64 KB limit).
  cascadeLog: {
    type: DataTypes.TEXT('medium'),
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { name: 'payments_idempotency_key', unique: true, fields: ['idempotencyKey'] },
  ],
});

Payment.prototype.toJSON = function () {
  const values = { ...this.get() };
  values._id = values.id;
  values.amountDue = parseFloat(values.amountDue || 0);
  values.amountPaid = parseFloat(values.amountPaid || 0);
  delete values.cascadeLog;
  delete values.idempotencyKey;
  return values;
};

module.exports = Payment;
