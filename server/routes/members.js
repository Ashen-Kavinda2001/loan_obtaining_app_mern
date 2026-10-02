const express = require('express');
const router  = express.Router();
const { getMembers, createMember, updateMember, deleteMember } = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All member routes require auth

// Read and register operations
router.get('/',       authorize('admin', 'loan_officer'), getMembers);
router.post('/',      authorize('admin', 'loan_officer'), createMember);

// Member modification and deletion: restricted to admin
router.put('/:id',    authorize('admin'), updateMember);
router.delete('/:id', authorize('admin'), deleteMember);

module.exports = router;
