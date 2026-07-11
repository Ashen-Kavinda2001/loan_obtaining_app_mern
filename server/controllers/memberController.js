const Member = require('../models/Member');

// @desc    Get all members (optional ?groupId=xxx or ?ungrouped=true)
// @route   GET /api/members
// @access  Private
const getMembers = async (req, res) => {
  try {
    let filter = {};
    if (req.query.groupId)       filter.groupId = req.query.groupId;
    if (req.query.ungrouped === 'true')
      filter = { $or: [{ groupId: null }, { groupId: { $exists: false } }] };

    const members = await Member.find(filter)
      .populate('groupId', 'name')
      .sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new member
// @route   POST /api/members
// @access  Private
const createMember = async (req, res) => {
  try {
    const { fullName, idNumber, village, contactNumber, age, groupId } = req.body;

    const existing = await Member.findOne({ idNumber });
    if (existing)
      return res.status(400).json({ message: 'A member with this NIC already exists' });

    const member = await Member.create({
      fullName, idNumber, village, contactNumber, age,
      groupId: groupId || null,
    });

    const populated = await Member.findById(member._id).populate('groupId', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update a member
// @route   PUT /api/members/:id
// @access  Private
const updateMember = async (req, res) => {
  try {
    const { fullName, idNumber, village, contactNumber, age, groupId } = req.body;

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (idNumber && idNumber !== member.idNumber) {
      const dup = await Member.findOne({ idNumber });
      if (dup) return res.status(400).json({ message: 'NIC already in use by another member' });
    }

    Object.assign(member, {
      fullName, idNumber, village, contactNumber, age,
      groupId: groupId !== undefined ? (groupId || null) : member.groupId,
    });

    await member.save();
    const populated = await Member.findById(member._id).populate('groupId', 'name');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a member
// @route   DELETE /api/members/:id
// @access  Private
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await member.deleteOne();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMembers, createMember, updateMember, deleteMember };
