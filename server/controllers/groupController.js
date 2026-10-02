const { Op, fn, col } = require('sequelize');
const { sequelize, Group, Member } = require('../models');

// @desc    Get all groups with member counts + ungrouped count
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.findAll({ order: [['createdAt', 'ASC']] });

    // One grouped COUNT instead of one query per group (which fanned out across the whole pool)
    const counts = await Member.findAll({
      attributes: ['groupId', [fn('COUNT', col('id')), 'count']],
      group: ['groupId'],
      raw: true,
    });
    const countByGroup = new Map(counts.map((c) => [c.groupId, Number(c.count)]));

    const groupsWithCount = groups.map((g) => ({
      ...g.toJSON(),
      memberCount: countByGroup.get(g.id) || 0,
    }));

    const ungroupedCount = countByGroup.get(null) || 0;

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

    // Both steps or neither: a failure halfway must not leave members pointing at a deleted group
    await sequelize.transaction(async (t) => {
      await Member.update({ groupId: null }, { where: { groupId: group.id }, transaction: t });
      await group.destroy({ transaction: t });
    });
    res.json({ message: 'Group deleted. Members have been moved to Ungrouped.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGroups, createGroup, updateGroup, deleteGroup };

