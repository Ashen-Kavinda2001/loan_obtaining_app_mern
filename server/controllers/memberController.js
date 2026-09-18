const { Member, Group, Loan } = require('../models');

// @desc    Get all members (optional ?groupId=xxx or ?ungrouped=true)
// @route   GET /api/members
// @access  Private
const getMembers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.groupId) {
      const parsedGroupId = parseInt(req.query.groupId, 10);
      if (isNaN(parsedGroupId)) {
        return res.status(400).json({ message: 'Invalid groupId format' });
      }
      filter.groupId = parsedGroupId;
    }
    if (req.query.ungrouped === 'true') {
      filter.groupId = null;
    }

    const members = await Member.findAll({
      where: filter,
      include: [{ model: Group, as: 'groupDetails', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new member
// @route   POST /api/members
// @access  Private
const createMember = async (req, res, next) => {
  try {
    const { fullName, idNumber, village, contactNumber, age, groupId } = req.body;

    const existing = await Member.findOne({ where: { idNumber } });
    if (existing)
      return res.status(400).json({ message: 'A member with this NIC already exists' });

    const member = await Member.create({
      fullName,
      idNumber,
      village,
      contactNumber,
      age: age ? parseInt(age, 10) : null,
      groupId: groupId ? parseInt(groupId, 10) : null,
      createdBy: req.user.id || req.user._id,
    });

    const populated = await Member.findByPk(member.id, {
      include: [{ model: Group, as: 'groupDetails', attributes: ['id', 'name'] }],
    });
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Update a member
// @route   PUT /api/members/:id
// @access  Private
const updateMember = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: 'Invalid member ID format' });
    }

    const { fullName, idNumber, village, contactNumber, age, groupId } = req.body;

    const member = await Member.findByPk(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (idNumber && idNumber !== member.idNumber) {
      const dup = await Member.findOne({ where: { idNumber } });
      if (dup) return res.status(400).json({ message: 'NIC already in use by another member' });
    }

    Object.assign(member, {
      fullName,
      idNumber,
      village,
      contactNumber,
      age: age !== undefined ? (age ? parseInt(age, 10) : null) : member.age,
      groupId: groupId !== undefined ? (groupId ? parseInt(groupId, 10) : null) : member.groupId,
    });

    await member.save();
    const populated = await Member.findByPk(member.id, {
      include: [{ model: Group, as: 'groupDetails', attributes: ['id', 'name'] }],
    });
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a member
// @route   DELETE /api/members/:id
// @access  Private
const deleteMember = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: 'Invalid member ID format' });
    }

    const member = await Member.findByPk(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Guard: check if member has associated loans
    const existingLoan = await Loan.findOne({ where: { memberId: member.id } });
    if (existingLoan) {
      return res.status(400).json({
        message: 'Cannot delete member with active or historical loan records. Please remove or archive loans first.',
      });
    }

    await member.destroy();
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMembers, createMember, updateMember, deleteMember };

