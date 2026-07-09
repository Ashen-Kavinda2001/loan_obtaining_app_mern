const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    loanAmount:        { type: Number, required: true },
    interestRate:      { type: Number, required: true, default: 30 },
    loanDuration:      { type: Number, required: true }, // months
    startDate:         { type: Date,   required: true },
    monthlyInstallment:{ type: Number, required: true },
    totalRepayable:    { type: Number, required: true },
    paidAmount:        { type: Number, default: 0 },
    remainingBalance:  { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
