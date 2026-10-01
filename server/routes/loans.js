const express = require('express');
const router  = express.Router();
const { getLoans, getStats, getCollections, createLoan, deleteLoan } = require('../controllers/loanController');
const { protect, authorize } = require('../middleware/auth');
const { statsLimiter }       = require('../middleware/rateLimiters');
const validate               = require('../middleware/validate');
const { idParams, loanCreate, loanDelete, collectionsQuery } = require('../validators/schemas');

router.use(protect);

// Read operations: accessible by admin and loan_officer (stats query throttled against DoS)
router.get('/stats',       authorize('admin', 'loan_officer'), statsLimiter, getStats);
router.get('/collections', authorize('admin', 'loan_officer'), statsLimiter, validate({ query: collectionsQuery }), getCollections);
router.get('/',            authorize('admin', 'loan_officer'), getLoans);

// Financial creation and deletion: restricted strictly to admin role
router.post('/',      authorize('admin'), validate({ body: loanCreate }), createLoan);
router.delete('/:id', authorize('admin'), validate({ params: idParams, query: loanDelete }), deleteLoan);

module.exports = router;
