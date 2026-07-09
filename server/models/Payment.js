const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
    },
    monthNumber: { type: Number, required: true },
    amountDue:   { type: Number, required: true },
    amountPaid:  { type: Number, default: 0 },
    dueDate:     { type: Date,   required: true },
    paidAt:      { type: Date,   default: null },
    isPartial:   { type: Boolean, default: false },
    isAutoPaid:  { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
