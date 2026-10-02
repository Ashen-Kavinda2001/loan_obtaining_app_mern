/**
 * Receipt SMS with a delivery log (models/SmsLog.js).
 *
 * Logging never stands in the way of sending: if the SmsLogs table is missing (migration not run
 * yet) or a log write fails, the SMS is still sent exactly as before and the problem is printed once.
 */
const { Op } = require('sequelize');
const { SmsLog } = require('../models');
const { sendSMS } = require('../utils/smsService');

const MAX_ATTEMPTS = 3;                       // automatic retries stop after this many attempts
const RETRY_WINDOW_MS = 48 * 60 * 60 * 1000;  // a receipt older than 2 days is not sent automatically
const STUCK_AFTER_MS = 10 * 60 * 1000;        // 'sending' this long means the process died mid-send

let warnedNoLog = false;
const warnLogFailure = (err) => {
  if (warnedNoLog) return;
  warnedNoLog = true;
  console.error(`⚠️  SMS log unavailable (${err.message}). SMS are still sent. Run "npm run migrate" to create the SmsLogs table.`);
};

const resultFields = (result) => ({
  status:           result.outcome,
  error:            result.error ? String(result.error).slice(0, 255) : null,
  providerResponse: result.data ? JSON.stringify(result.data).slice(0, 2000) : null,
  ...(result.recipient ? { phone: result.recipient } : {}), // the number as the gateway got it
});

// Send `message` and record the outcome. Returns the sendSMS result.
const sendLogged = async ({ loanId = null, paymentId = null, memberId = null, phone, message }) => {
  let log = null;
  try {
    log = await SmsLog.create({
      loanId, paymentId, memberId, phone: String(phone || '').slice(0, 20), message,
      status: 'sending', attempts: 1, lastAttemptAt: new Date(),
    });
  } catch (err) {
    warnLogFailure(err);
  }

  const result = await sendSMS(phone, message);

  if (log) {
    try {
      await log.update(resultFields(result));
    } catch (err) {
      warnLogFailure(err);
    }
  }
  return result;
};

/**
 * Send an existing log row's message again and record the attempt on the same row.
 * Only one sender can hold a row: it is claimed with a conditional UPDATE, so two clicks (or a
 * click and the retry job) can never send the same receipt twice at the same moment.
 * `allowed` lists the statuses that may be resent. Returns the sendSMS result, or null if the row
 * was not claimable (already being sent, or not in an allowed status).
 */
const resend = async (logId, { allowed, resentBy = null } = {}) => {
  const [claimed] = await SmsLog.update(
    { status: 'sending', lastAttemptAt: new Date(), resentBy },
    { where: { id: logId, status: { [Op.in]: allowed } } },
  );
  if (claimed !== 1) return null;

  const log = await SmsLog.findByPk(logId);
  await log.increment('attempts');
  const result = await sendSMS(log.phone, log.message);
  await log.update(resultFields(result));
  return result;
};

/**
 * The retry job (scripts/retry-sms.js): resend receipts the gateway definitely did not send.
 * 'unknown' receipts are left for a person, because the customer may already have them.
 */
const retryFailed = async ({ now = new Date() } = {}) => {
  // A process that stopped mid-send leaves 'sending'; whether it went out is unknown
  const [stuck] = await SmsLog.update(
    { status: 'unknown', error: 'Sending was interrupted' },
    { where: { status: 'sending', lastAttemptAt: { [Op.lt]: new Date(now - STUCK_AFTER_MS) } } },
  );

  const due = await SmsLog.findAll({
    where: {
      status:    'failed',
      attempts:  { [Op.lt]: MAX_ATTEMPTS },
      createdAt: { [Op.gte]: new Date(now - RETRY_WINDOW_MS) },
    },
    order: [['id', 'ASC']],
    limit: 50,
  });

  const counts = { retried: 0, sent: 0, stillFailing: 0, stuck };
  for (const log of due) {
    const result = await resend(log.id, { allowed: ['failed'] });
    if (!result) continue;
    counts.retried++;
    if (result.outcome === 'sent') counts.sent++;
    else counts.stillFailing++;
  }
  return counts;
};

module.exports = { sendLogged, resend, retryFailed, MAX_ATTEMPTS };
