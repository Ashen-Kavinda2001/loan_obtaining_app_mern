const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * One receipt SMS and what happened to it (table created by migrations/002-sms-logs.js).
 *
 * status:
 *   sending  — being sent right now
 *   sent     — the gateway accepted it
 *   failed   — the gateway rejected it or could not be reached; nothing was sent, so it is safe to retry
 *   unknown  — no clear answer (timeout or dropped connection); it may have been delivered, so it is
 *              never retried automatically, only by a person (Resend)
 *   skipped  — not sent on purpose (SMS disabled, no API token, no valid phone number)
 */
const SmsLog = sequelize.define('SmsLog', {
  id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  loanId:           { type: DataTypes.INTEGER, allowNull: true },
  paymentId:        { type: DataTypes.INTEGER, allowNull: true },
  memberId:         { type: DataTypes.INTEGER, allowNull: true },
  phone:            { type: DataTypes.STRING(20), allowNull: true },
  message:          { type: DataTypes.TEXT, allowNull: false },
  status:           { type: DataTypes.STRING(16), allowNull: false },
  error:            { type: DataTypes.STRING(255), allowNull: true },
  providerResponse: { type: DataTypes.TEXT, allowNull: true },
  attempts:         { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lastAttemptAt:    { type: DataTypes.DATE, allowNull: true },
  resentBy:         { type: DataTypes.INTEGER, allowNull: true },
}, {
  timestamps: true,
});

module.exports = SmsLog;
