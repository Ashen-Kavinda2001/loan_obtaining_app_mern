const { Op } = require('sequelize');
const { Member, Group, Loan } = require('../models');

// A groupId from the client must point at a real group (null = ungrouped)
const groupExists = async (groupId) => groupId == null || Boolean(await Group.findByPk(groupId, { attributes: ['id'] }));

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
    const data = req.valid.body; // validated + normalized by validators/schemas.memberCreate

    const existing = await Member.findOne({ where: { idNumber: data.idNumber } });
    if (existing)
      return res.status(400).json({ message: 'A member with this NIC already exists' });

    const groupId = data.groupId ?? null;
    if (!(await groupExists(groupId))) return res.status(400).json({ message: 'Selected group does not exist' });

    const member = await Member.create({
      ...data,
      groupId,
      createdBy: req.user.id,
    });

    const populated = await Member.findByPk(member.id, {
      include: [{ model: Group, as: 'groupDetails', attributes: ['id', 'name'] }],
    });
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Update a member. Only the fields sent are changed (B16).
// @route   PUT /api/members/:id
// @access  Private
const updateMember = async (req, res, next) => {
  try {
    const { id } = req.valid.params;
    const changes = req.valid.body; // validated + normalized by validators/schemas.memberUpdate

    const member = await Member.findByPk(id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (changes.idNumber && changes.idNumber !== member.idNumber) {
      const dup = await Member.findOne({ where: { idNumber: changes.idNumber, id: { [Op.ne]: member.id } } });
      if (dup) return res.status(400).json({ message: 'NIC already in use by another member' });
    }

    if (changes.groupId !== undefined && !(await groupExists(changes.groupId))) {
      return res.status(400).json({ message: 'Selected group does not exist' });
    }

    await member.update(changes);
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
    const { id } = req.valid.params;

    const member = await Member.findByPk(id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Guard: deleted (archived) loans count too; their history must keep pointing at this member
    const existingLoan = await Loan.findOne({ where: { memberId: member.id }, paranoid: false });
    if (existingLoan) {
      return res.status(400).json({
        message: 'Cannot delete a member who has loan records, including deleted loans kept for audit.',
      });
    }

    await member.destroy();
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMembers, createMember, updateMember, deleteMember };
