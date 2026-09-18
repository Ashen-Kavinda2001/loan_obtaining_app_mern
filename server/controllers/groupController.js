const { Op } = require('sequelize');
const { Group, Member } = require('../models');

// @desc    Get all groups with member counts + ungrouped count
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.findAll({ order: [['createdAt', 'ASC']] });

    const groupsWithCount = await Promise.all(
      groups.map(async (g) => {
        const memberCount = await Member.count({ where: { groupId: g.id } });
        return { ...g.toJSON(), memberCount };
      })
    );

    const ungroupedCount = await Member.count({
      where: { groupId: null },
    });

    res.json({ groups: groupsWithCount, ungroupedCount });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim())
      return res.status(400).json({ message: 'Group name is required' });

    const cleanName = name.trim();
    const exists = await Group.findOne({ where: { name: cleanName } });
    if (exists)
      return res.status(400).json({ message: 'A group with this name already exists' });

    const group = await Group.create({ name: cleanName });
    res.status(201).json({ ...group.toJSON(), memberCount: 0 });
  } catch (err) {
    next(err);
  }
};

// @desc    Rename a group
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim())
      return res.status(400).json({ message: 'Group name is required' });

    const cleanName = name.trim();
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const duplicate = await Group.findOne({
      where: {
        name: cleanName,
        id: { [Op.ne]: group.id },
      },
    });
    if (duplicate)
      return res.status(400).json({ message: 'A group with this name already exists' });

    group.name = cleanName;
    await group.save();
    const memberCount = await Member.count({ where: { groupId: group.id } });
    res.json({ ...group.toJSON(), memberCount });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a group (members become ungrouped, not deleted)
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Unassign all members in this group
    await Member.update({ groupId: null }, { where: { groupId: group.id } });

    await group.destroy();
    res.json({ message: 'Group deleted. Members have been moved to Ungrouped.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGroups, createGroup, updateGroup, deleteGroup };

