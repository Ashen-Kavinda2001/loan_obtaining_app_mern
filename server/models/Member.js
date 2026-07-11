const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    fullName:      { type: String, required: true, trim: true },
    idNumber:      { type: String, required: true, unique: true, trim: true },
    village:       { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    age:           { type: Number, required: true, min: 18, max: 100 },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);
