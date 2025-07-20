const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  EID: { type: Number, unique: true },
  EName: String,
  Total: Number,
  Available: Number,
  Created_At: { type: Date, default: Date.now },
  Update_At: { type: Date },
});

module.exports = mongoose.models.Equipment || mongoose.model('Equipment', equipmentSchema);
