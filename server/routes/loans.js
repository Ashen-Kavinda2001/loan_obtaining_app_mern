const express = require('express');
const router  = express.Router();
const { getLoans, getStats, createLoan, deleteLoan } = require('../controllers/loanController');
const { protect, authorize } = require('../middleware/auth');
const { statsLimiter }       = require('../middleware/rateLimiters');

router.use(protect);

// Read operations: accessible by admin and loan_officer (stats query throttled against DoS)
router.get('/stats', authorize('admin', 'loan_officer'), statsLimiter, getStats);
router.get('/',      authorize('admin', 'loan_officer'), getLoans);

// Financial creation and deletion: restricted strictly to admin role
router.post('/',     authorize('admin'), createLoan);
router.delete('/:id', authorize('admin'), deleteLoan);

module.exports = router;
