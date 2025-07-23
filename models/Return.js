const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  ReturnID: { type: Number, unique: true },
  username: String,
  name: String,
  EquipmentID: Number,
  Ename:String,
  Quantity: Number,
  ReturnDate: Date,
  Created_At: { type: Date, default: Date.now },
});

// แก้ตรงนี้
module.exports = mongoose.models.Return || mongoose.model('Return', returnSchema);
