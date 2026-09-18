const express = require('express');
const router  = express.Router();
const { getPayments, markPaid, markUnpaid } = require('../controllers/paymentController');
const { protect, authorize }        = require('../middleware/auth');
const { financialActionLimiter } = require('../middleware/rateLimiters');

router.use(protect);

router.get('/',            authorize('admin', 'loan_officer'),                         getPayments);
router.patch('/:id/pay',   authorize('admin', 'loan_officer'), financialActionLimiter, markPaid);
router.patch('/:id/unpay', authorize('admin'),                 financialActionLimiter, markUnpaid);

module.exports = router;
