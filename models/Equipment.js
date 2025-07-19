const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  total: { type: Number, required: true },
  available: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

equipmentSchema.plugin(AutoIncrement, { inc_field: 'EID' });

equipmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Equipment', equipmentSchema);
