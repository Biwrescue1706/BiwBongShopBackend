const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  EID: { type: Number, unique: true, required: true },
  EName: { type: String, required: true },
  Total: { type: Number, required: true },
  Available: { type: Number, required: true },
  Created_ById: { type: Number, required: true },        // UserId เป็นเลข
  Created_Byusername: { type: String, required: true },
  Update_ById: { type: Number, default: null },          // UserId เป็นเลข หรือ null ถ้ายังไม่แก้ไข
  Update_Byusername: { type: String, default: null },
  Created_At: { type: Date, default: Date.now },
  Update_At: { type: Date, default: null },
});

module.exports = mongoose.models.Equipment || mongoose.model('Equipment', equipmentSchema);
