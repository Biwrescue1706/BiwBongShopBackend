const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../../src/prisma');   // <- Prisma client
const router = express.Router();

// ดึงผู้ใช้ทั้งหมด (ไม่คืน password)
router.get('/getall', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        UserId: true,
        username: true,
        name: true,
        Created_At: true,
        Update_At: true
      },
      orderBy: { UserId: 'asc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ดึงผู้ใช้ตาม UserId (ไม่คืน password)
router.get('/getall/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { UserId: id },
      select: {
        UserId: true,
        username: true,
        name: true,
        Created_At: true,
        Update_At: true
      }
    });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    res.json({ message: `สมาชิก คนที่ ${id}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// อัปเดตข้อมูลผู้ใช้ (username, name, password)
router.put('/getall/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { username, name, password } = req.body;

    const found = await prisma.user.findUnique({ where: { UserId: id } });
    if (!found) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    let hashed;
    if (password) {
      hashed = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { UserId: id },
      data: {
        username: username ?? undefined,
        name: name ?? undefined,
        password: hashed ?? undefined,
        Update_At: new Date()
      },
      select: {
        UserId: true,
        username: true,
        name: true,
        Created_At: true,
        Update_At: true
      }
    });

    res.json({ message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ', user: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//ลบผู้ใช้ตาม UserId
router.delete('/getall/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    await prisma.user.delete({ where: { UserId: id } });
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;
