const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  ReturnID: { type: Number, unique: true },
  BorrowID: Number,
  username: String,
  name: String,
  names: String,
  EquipmentID: Number,
  Ename:String,
  Quantity: Number,
  ReturnDate: Date,
  Created_At: { type: Date, default: Date.now },
  Update_At: { type: Date, default: null },
});

// แก้ตรงนี้
module.exports = mongoose.models.Return || mongoose.model('Return', returnSchema);
