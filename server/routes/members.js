const express = require('express');
const router  = express.Router();
const { getMembers, createMember, updateMember, deleteMember } = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');
const validate               = require('../middleware/validate');
const { idParams, memberCreate, memberUpdate, membersQuery } = require('../validators/schemas');

router.use(protect); // All member routes require auth

// Read and register operations
router.get('/',       authorize('admin', 'loan_officer'), validate({ query: membersQuery }), getMembers);
router.post('/',      authorize('admin', 'loan_officer'), validate({ body: memberCreate }), createMember);

// Member modification and deletion: restricted to admin
router.put('/:id',    authorize('admin'), validate({ params: idParams, body: memberUpdate }), updateMember);
router.delete('/:id', authorize('admin'), validate({ params: idParams }), deleteMember);

module.exports = router;
