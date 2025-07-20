const express = require('express');
const Equipment = require('../models/Equipment');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/getall', async (req, res) => {
  try {
    const equipments = await Equipment.find()
      .populate('Created_ById', 'username name')
      .populate('Update_ById', 'username name').select(' -_id -__v');
    res.json(equipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/getall/create', authenticateToken, async (req, res) => {
  console.log('Request body:', req.body); // เพิ่ม log เพื่อตรวจสอบ
  try {
    const { EName, Total } = req.body;
    if (!EName || typeof Total !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุชื่ออุปกรณ์และจำนวนทั้งหมด' });
    }

    const last = await Equipment.findOne().sort({ EID: -1 });
    const newEID = last ? last.EID + 1 : 1;

    const equipment = new Equipment({
      EID: newEID,
      EName,
      Total,
      Available: Total,
      Created_ById: req.user.UserId,
      Created_Byusername: req.user.username,
      Created_At: new Date(),
      Update_At: null,
      Update_ById: null,
      Update_Byusername: null,
    });

    await equipment.save();
    res.status(201).json(equipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์", error: err.message });
  }
});

router.get('/getall/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findOne({ EID: parseInt(req.params.id, 10) });
    if (!equipment) return res.status(404).json({ message: "ไม่พบอุปกรณ์" }).select(' -_id -__v');
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// อัปเดตอุปกรณ์ พร้อมเก็บข้อมูลผู้แก้ไข
router.put('/getall/:id', authenticateToken, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id, 10);
    const { EName, Total } = req.body;

    const equipment = await Equipment.findOne({ EID: equipmentId });
    if (!equipment) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์" });
    }

    if (EName) {
      equipment.EName = EName;
    }

    if (typeof Total === 'number') {
      // คำนวณจำนวนที่ถูกยืมออกไป (Total - Available)
      const borrowed = equipment.Total - equipment.Available;

      if (Total < borrowed) {
        return res.status(400).json({ message: "จำนวนรวม (Total) ต้องไม่น้อยกว่าจำนวนที่ยืมออกไป" });
      }

      equipment.Total = Total;
      equipment.Available = Total - borrowed;
    }

    // บันทึกข้อมูลผู้แก้ไขและเวลา
    equipment.Update_ById = req.user.UserId;
    equipment.Update_Byusername = req.user.username;
    equipment.Update_At = new Date();

    await equipment.save();

    res.json({
      message: "อัปเดตอุปกรณ์เรียบร้อย",
      equipment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการอัปเดตอุปกรณ์",
      error: err.message
    });
  }
});

// ลบอุปกรณ์
router.delete('/getall/:id', authenticateToken, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id, 10);
    const equipment = await Equipment.findOneAndDelete({ EID: equipmentId });

    if (!equipment) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์ที่ต้องการลบ" });
    }

    res.json({ message: "ลบอุปกรณ์เรียบร้อย" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบอุปกรณ์", error: err.message });
  }
});

module.exports = router;
