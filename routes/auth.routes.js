const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = require('../middleware/authenticateToken');

// Helper สำหรับเพิ่ม UserId
async function getNextUserId() {
  const lastUser = await User.findOne().sort({ UserId: -1 });
  return lastUser ? lastUser.UserId + 1 : 1;
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, name, password } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ message: "กรุณากรอก username, name และ password ให้ครบ" });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username นี้ถูกใช้งานแล้ว" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      UserId: await getNextUserId(),
      username,
      name,
      password: hashedPassword,
      Update_At: null
    });
    await newUser.save();

    res.json({
      message: "สมัครสมาชิกสำเร็จ",
      user: {
        UserId: newUser.UserId,
        username: newUser.username,
        name: newUser.name,
        Created_At: newUser.Created_At,
        Update_At: newUser.Update_At
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด ในการ สมัครสมาชิก", error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "กรุณากรอก username และ password" });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });

    const datapayload = {
      username: user.username,
      name: user.name,
      UserId: user.UserId
    }

    const token = jwt.sign(
      datapayload,
      JWT_SECRET,
      {
        expiresIn: "15m"
      }
    ); // token หมดอายุ 15 นาที

    res.cookie('token', token, {
      httpOnly: true,         // ถ้าอยากให้ frontend เห็นให้เปลี่ยนเป็น false (ไม่แนะนำ)
      secure: true,           // ต้องเป็น true ถ้าใช้ HTTPS
      sameSite: 'None',       // ต้องตั้ง None ถ้า frontend/backend คนละ origin
      maxAge: 15 * 60 * 1000
    });

    res.json({
      "message": "เข้าสู่ระบบสำเร็จแล้ว",
      "token": token,
      "ข้อมูล": {
        "ไอดี": user.UserId,
        "ชื่อผู้ใช้": user.username,
        "ชื่อ": user.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: err.message
    });
  }
});

router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});


// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'ออกจากระบบสำเร็จแล้ว' });
});

// ✅ ลืมรหัสผ่าน (ตรวจสอบ username ว่ามีในระบบไหม)
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });

    // คุณสามารถเลือกส่ง email หรือ redirect ไปหน้า reset ได้
    res.json({ message: 'พบชื่อผู้ใช้ในระบบ สามารถเปลี่ยนรหัสผ่านได้' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ✅ รีเซ็ตรหัสผ่าน (ไม่ใช้ token)
router.post('/reset-password', async (req, res) => {
  const { username, newPassword } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;