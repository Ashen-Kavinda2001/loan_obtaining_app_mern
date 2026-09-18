const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('id');
    },
  },
  name: {
    type: DataTypes.STRING(191),
    allowNull: false,
    unique: true,
    set(value) {
      if (value) this.setDataValue('name', value.trim());
    },
  },
}, {
  timestamps: true,
});

Group.prototype.toJSON = function () {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

module.exports = Group;
