const { SmsLog } = require('../models');
const { resend } = require('../services/smsReceipts');

// @desc    Receipt SMS for one loan, newest first (shown under the payment schedule)
// @route   GET /api/sms-logs?loanId=xxx
// @access  Private
const getSmsLogs = async (req, res, next) => {
  try {
    const logs = await SmsLog.findAll({
      where: { loanId: req.valid.query.loanId },
      attributes: ['id', 'loanId', 'paymentId', 'phone', 'status', 'error', 'attempts', 'lastAttemptAt', 'createdAt'],
      order: [['id', 'DESC']],
      limit: 200,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

// @desc    Send a receipt SMS again. Allowed for failed, unknown and skipped receipts, and for sent
//          ones too (a customer may ask for it again); never while it is being sent.
//          Answers straight away; the SMS goes out in the background (the gateway can take 30 s).
// @route   POST /api/sms-logs/:id/resend
// @access  Private (admin)
const resendSms = async (req, res, next) => {
  try {
    const log = await SmsLog.findByPk(req.valid.params.id, { attributes: ['id', 'status'] });
    if (!log) return res.status(404).json({ message: 'SMS record not found' });
    if (log.status === 'sending') return res.status(409).json({ message: 'This SMS is being sent right now' });

    res.status(202).json({ id: log.id, status: 'sending' });

    setImmediate(async () => {
      try {
        const result = await resend(log.id, { allowed: ['failed', 'unknown', 'skipped', 'sent'], resentBy: req.user.id });
        console.info(`[audit] sms resent: log=${log.id} by=${req.user.id} outcome=${result ? result.outcome : 'not-claimed'}`);
      } catch (err) {
        console.error(`⚠️  SMS resend ${log.id} failed:`, err.message);
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSmsLogs, resendSms };
