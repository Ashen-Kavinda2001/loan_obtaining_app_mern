const express = require('express');
const router  = express.Router();
const { getMembers, createMember, updateMember, deleteMember } = require('../controllers/memberController');
const { protect } = require('../middleware/auth');

router.use(protect); // all member routes require auth

router.get('/',     getMembers);
router.post('/',    createMember);
router.put('/:id',  updateMember);
router.delete('/:id', deleteMember);

module.exports = router;
