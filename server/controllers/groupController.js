const Group  = require('../models/Group');
const Member = require('../models/Member');

// @desc    Get all groups with member counts + ungrouped count
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find().sort({ createdAt: 1 });

    const groupsWithCount = await Promise.all(
      groups.map(async (g) => {
        const memberCount = await Member.countDocuments({ groupId: g._id });
        return { ...g.toObject(), memberCount };
      })
    );

    const ungroupedCount = await Member.countDocuments({
      $or: [{ groupId: null }, { groupId: { $exists: false } }],
    });

    res.json({ groups: groupsWithCount, ungroupedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: 'Group name is required' });

    const exists = await Group.findOne({ name: name.trim() });
    if (exists)
      return res.status(400).json({ message: 'A group with this name already exists' });

    const group = await Group.create({ name: name.trim() });
    res.status(201).json({ ...group.toObject(), memberCount: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Rename a group
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: 'Group name is required' });

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const duplicate = await Group.findOne({ name: name.trim(), _id: { $ne: group._id } });
    if (duplicate)
      return res.status(400).json({ message: 'A group with this name already exists' });

    group.name = name.trim();
    const updated = await group.save();
    const memberCount = await Member.countDocuments({ groupId: group._id });
    res.json({ ...updated.toObject(), memberCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a group (members become ungrouped, not deleted)
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Unassign all members in this group
    await Member.updateMany({ groupId: group._id }, { $set: { groupId: null } });

    await group.deleteOne();
    res.json({ message: 'Group deleted. Members have been moved to Ungrouped.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getGroups, createGroup, updateGroup, deleteGroup };
