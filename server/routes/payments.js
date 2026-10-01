const express = require('express');
const router  = express.Router();
const { getPayments, markPaid, markUnpaid } = require('../controllers/paymentController');
const { protect, authorize }        = require('../middleware/auth');
const { financialActionLimiter } = require('../middleware/rateLimiters');
const validate                   = require('../middleware/validate');
const { idParams, paymentsQuery, markPaidBody } = require('../validators/schemas');

router.use(protect);

router.get('/',            authorize('admin', 'loan_officer'),                         validate({ query: paymentsQuery }),                 getPayments);
router.post('/:id/pay',    authorize('admin', 'loan_officer'), financialActionLimiter, validate({ params: idParams, body: markPaidBody }), markPaid);
router.patch('/:id/unpay', authorize('admin'),                 financialActionLimiter, validate({ params: idParams }),                     markUnpaid);

module.exports = router;
