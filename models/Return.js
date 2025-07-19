const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const returnSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  quantity: { type: Number, required: true },
  returnDate: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

returnSchema.plugin(AutoIncrement, { inc_field: 'returnId' });

module.exports = mongoose.model('Return', returnSchema);
