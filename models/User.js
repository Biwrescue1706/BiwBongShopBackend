const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  UserId: { type: Number, unique: true },
  username: { type: String, unique: true, required: true },
  name: String,
  password: String,
  Created_At: { type: Date, default: Date.now },
  Update_At: { type: Date },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
