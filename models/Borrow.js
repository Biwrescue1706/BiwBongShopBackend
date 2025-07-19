const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const borrowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  quantity: { type: Number, required: true },
  borrowDate: { type: Date, required: true, default: Date.now },
  
  // เปลี่ยนจาก returnDate: Date เป็น
  returnRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Return', default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

borrowSchema.plugin(AutoIncrement, { inc_field: 'BorrowID' });

borrowSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Borrow', borrowSchema);
