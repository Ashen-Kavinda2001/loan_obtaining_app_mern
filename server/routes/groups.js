const express = require('express');
const router  = express.Router();
const { getGroups, createGroup, updateGroup, deleteGroup } = require('../controllers/groupController');
const { protect, authorize }   = require('../middleware/auth');
const { groupQueryLimiter }    = require('../middleware/rateLimiters');

router.use(protect);

// Read operations: accessible by admin and loan_officer (throttled against $O(N)$ DB load)
router.get('/',       authorize('admin', 'loan_officer'), groupQueryLimiter, getGroups);

// Group management (create, rename, delete): strictly admin
router.post('/',      authorize('admin'), createGroup);
router.put('/:id',    authorize('admin'), updateGroup);
router.delete('/:id', authorize('admin'), deleteGroup);

module.exports = router;
