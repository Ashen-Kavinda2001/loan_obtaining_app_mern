const express = require('express');
const router  = express.Router();
const { getGroups, createGroup, updateGroup, deleteGroup } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',      getGroups);      // GET  /api/groups
router.post('/',     createGroup);    // POST /api/groups
router.put('/:id',   updateGroup);    // PUT  /api/groups/:id
router.delete('/:id', deleteGroup);  // DELETE /api/groups/:id

module.exports = router;
