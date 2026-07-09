const express = require('express');
const router  = express.Router();
const { getPayments, markPaid, markUnpaid } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',              getPayments);        // GET /api/payments?loanId=xxx
router.patch('/:id/pay',     markPaid);           // PATCH /api/payments/:id/pay
router.patch('/:id/unpay',   markUnpaid);         // PATCH /api/payments/:id/unpay

module.exports = router;
