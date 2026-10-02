const express = require('express');
const router  = express.Router();
const { getSmsLogs, resendSms } = require('../controllers/smsLogController');
const { protect, authorize }    = require('../middleware/auth');
const { financialActionLimiter } = require('../middleware/rateLimiters');
const validate                  = require('../middleware/validate');
const { idParams, paymentsQuery } = require('../validators/schemas');

router.use(protect);

router.get('/',            authorize('admin', 'loan_officer'), validate({ query: paymentsQuery }), getSmsLogs);
router.post('/:id/resend', authorize('admin'), financialActionLimiter, validate({ params: idParams }), resendSms);

module.exports = router;
