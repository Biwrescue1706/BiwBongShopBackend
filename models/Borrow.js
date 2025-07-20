const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
  BorrowID: { type: Number, unique: true },
  username: String,
  name: String,
  EquipmentID: Number,
  Quantity: Number,
  Date: Date,
  ReturnDate: Date,
  Returned: { type: Boolean, default: false },
  Created_At: { type: Date, default: Date.now },
  Update_At: { type: Date },
});

module.exports = mongoose.models.Borrow || mongoose.model('Borrow', borrowSchema);
