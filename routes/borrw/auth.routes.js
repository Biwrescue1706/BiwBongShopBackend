// routes/borrw/auth.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../src/prisma');
const authenticateToken = require('../../middleware/authenticateToken');
const { nextUserId } = require('../../src/utils/ids');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ========== Register ==========
router.post('/register', async (req, res) => {
  try {
    const { username, name, password } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ message: 'กรุณากรอก username, name และ password ให้ครบ' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(409).json({ message: 'Username นี้ถูกใช้งานแล้ว' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        UserId: await nextUserId(),
        username,
        name,
        password: hashed,
        Update_At: null
      },
      select: { UserId: true, username: true, name: true, Created_At: true, Update_At: true }
    });

    res.json({ message: 'สมัครสมาชิกสำเร็จ', user });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด ในการ สมัครสมาชิก', error: err.message });
  }
});

// ========== Login ==========
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'กรุณากรอก username และ password' });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

    const payload = { username: user.username, name: user.name, UserId: user.UserId };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,       // ใช้ HTTPS ให้เป็น true
      sameSite: 'None',   // ถ้า front/back คนละ origin ต้องเป็น None
      maxAge: 15 * 60 * 1000
    });

    res.json({
      message: 'เข้าสู่ระบบสำเร็จแล้ว',
      token,
      ข้อมูล: { ไอดี: user.UserId, ชื่อผู้ใช้: user.username, ชื่อ: user.name }
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== Profile (ต้อง login) ==========
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ========== Logout ==========
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'ออกจากระบบสำเร็จแล้ว' });
});

// ========== Forgot password (ตรวจสอบว่ามี username ไหม) ==========
router.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
    res.json({ message: 'พบชื่อผู้ใช้ในระบบ สามารถเปลี่ยนรหัสผ่านได้' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== Reset password (ไม่ใช้ token) ==========
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { username },
      data: { password: hashed, Update_At: new Date() }
    });

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;
