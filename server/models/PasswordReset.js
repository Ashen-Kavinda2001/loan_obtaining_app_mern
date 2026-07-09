const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true, trim: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  used:      { type: Boolean, default: false },
}, { timestamps: true });

// Auto-delete expired documents after they expire
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
