const express = require('express');
const User = require('../models/User');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// GET all users
router.get('/getall', async (req, res) => {
  try {
    const users = await User.find().select('-password -_id -__v');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔒 Get user by ID
router.get('/getall/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await User.findOne({ UserId: id }).select('-password -_id -__v');
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    res.json({ message: `สมาชิก คนที่ ${id}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user
router.put('/getall/:id', async (req, res) => {
  const { Name, Password } = req.body;
  try {
    const id = parseInt(req.params.id, 10);
    const user = await User.findOne({ UserId: id });
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    if (Name) user.name = Name;
    if (Password) user.password = await bcrypt.hash(Password, 10);
    user.Update_At = new Date();

    await user.save();

    res.json({
      message: "อัปเดตข้อมูลผู้ใช้สำเร็จ", user: {
        UserId: user.UserId,
        username: user.username,
        name: user.name,
        Created_At: user.Created_At,
        Update_At: user.Update_At
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔒 Delete user by ID
router.delete('/getall/:id', async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ UserId: req.params.id });
    if (!deletedUser) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

module.exports = router;
