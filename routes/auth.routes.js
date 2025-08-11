// routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === 'production';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

// ===== Helpers =====
async function getNextUserId() {
  const lastUser = await User.findOne().sort({ UserId: -1 });
  return lastUser ? lastUser.UserId + 1 : 1;
}

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    secure: isProd,                 // https เท่านั้นเมื่อ production
    sameSite: isProd ? 'none' : 'lax', // cross-site ต้อง none
    path: '/',
    maxAge: maxAgeMs,
  };
}

// ===== Register =====
router.post('/register', async (req, res) => {
  try {
    const { username, name, password } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ message: 'กรุณากรอก username, name และ password ให้ครบ' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username นี้ถูกใช้งานแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      UserId: await getNextUserId(),
      username,
      name,
      password: hashedPassword,
      Update_At: null,
    });
    await newUser.save();

    res.json({
      message: 'สมัครสมาชิกสำเร็จ',
      user: {
        UserId: newUser.UserId,
        username: newUser.username,
        name: newUser.name,
        Created_At: newUser.Created_At,
        Update_At: newUser.Update_At,
      },
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด ในการ สมัครสมาชิก', error: err.message });
  }
});

// ===== Login =====
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'กรุณากรอก username และ password' });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

    const payload = { UserId: user.UserId, username: user.username, name: user.name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    res.cookie('token', token, cookieOpts(15 * 60 * 1000)); // 15 นาที

    // ถ้าใช้ httpOnly cookie อยู่แล้ว ไม่จำเป็นต้องส่ง token กลับ
    res.json({
      message: 'เข้าสู่ระบบสำเร็จแล้ว',
      user: payload,
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ===== Me/Profile (ต้องมีคุกกี้ token) =====
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ===== Logout =====
router.post('/logout', (req, res) => {
  // ต้องระบุ option เดิมเวลา clearCookie ไม่งั้นบางเบราว์เซอร์ไม่ลบ
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
  res.json({ message: 'ออกจากระบบสำเร็จแล้ว' });
});

// ===== Forgot Password =====
router.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'กรุณากรอก username' });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });

    // จุดนี้สามารถต่อการส่งอีเมล/ลิงก์รีเซ็ตได้
    res.json({ message: 'พบชื่อผู้ใช้ในระบบ สามารถเปลี่ยนรหัสผ่านได้' });
  } catch (err) {
    console.error('[forgot-password]', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ===== Reset Password (no token) =====
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!username || !newPassword)
      return res.status(400).json({ message: 'กรุณากรอก username และ newPassword' });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;