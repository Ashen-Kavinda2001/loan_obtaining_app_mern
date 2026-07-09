const express = require('express');
const router  = express.Router();
const { getLoans, getStats, createLoan } = require('../controllers/loanController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);   // MUST be before /:id routes
router.get('/',      getLoans);
router.post('/',     createLoan);

module.exports = router;
