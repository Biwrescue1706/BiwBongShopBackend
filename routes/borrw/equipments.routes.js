const express = require('express');
const prisma = require('../../src/prisma');                 // <- Prisma client
const authenticateToken = require('../../middleware/authenticateToken');
const { nextEquipId } = require('../../src/utils/ids');

const router = express.Router();

// ดึงอุปกรณ์ทั้งหมด
router.get('/getall', async (_req, res) => {
  try {
    const equipments = await prisma.equipment.findMany({
      orderBy: [
        { EName: 'asc' }, 
        { Available: 'desc' }
      ]
    });
    res.json(equipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// เพิ่มอุปกรณ์ใหม่ (ต้อง login)
router.post('/getall/create', authenticateToken, async (req, res) => {
  try {
    const { EName, Total } = req.body;
    if (!EName || typeof Total !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุชื่ออุปกรณ์และจำนวนทั้งหมด' });
    }

    const newEquipment = await prisma.equipment.create({
      data: {
        EID: await nextEquipId(),
        EName,
        Total,
        Available: Total,
        Created_ById: req.user.UserId,
        Created_Byusername: req.user.username,
        Created_At: new Date(),
        Update_At: null,
        Update_ById: null,
        Update_Byusername: null
      }
    });

    res.status(201).json(newEquipment);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์', error: err.message });
  }
});

// ดึงอุปกรณ์ตาม EID
router.get('/getall/:id', async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id, 10);
    const equipment = await prisma.equipment.findUnique({ where: { EID: equipmentId } });

    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    res.json(equipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// อัปเดตอุปกรณ์ (ชื่อ, จำนวน) + เก็บข้อมูลผู้แก้ไข
router.put('/getall/:id', authenticateToken, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id, 10);
    const { EName, Total } = req.body;

    const equipment = await prisma.equipment.findUnique({ where: { EID: equipmentId } });
    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    let newTotal = equipment.Total;
    let newAvailable = equipment.Available;

    if (EName) {
      equipment.EName = EName;
    }

    if (typeof Total === 'number') {
      const borrowed = equipment.Total - equipment.Available; // ถูกยืมไปแล้ว
      if (Total < borrowed) {
        return res.status(400).json({ message: 'จำนวนรวม (Total) ต้องไม่น้อยกว่าจำนวนที่ยืมออกไป' });
      }
      newTotal = Total;
      newAvailable = Total - borrowed;
    }

    const updated = await prisma.equipment.update({
      where: { EID: equipmentId },
      data: {
        EName: EName ?? equipment.EName,
        Total: newTotal,
        Available: newAvailable,
        Update_ById: req.user.UserId,
        Update_Byusername: req.user.username,
        Update_At: new Date()
      }
    });

    res.json({ message: 'อัปเดตอุปกรณ์เรียบร้อย', equipment: updated });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตอุปกรณ์', error: err.message });
  }
});

// ลบอุปกรณ์
router.delete('/getall/:id', authenticateToken, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id, 10);
    await prisma.equipment.delete({ where: { EID: equipmentId } });
    res.json({ message: 'ลบอุปกรณ์เรียบร้อย' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์ที่ต้องการลบ' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบอุปกรณ์', error: err.message });
  }
});

module.exports = router;
