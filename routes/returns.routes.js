// routes/returns.routes.js
const express = require('express');
const Return = require('../models/Return');
const Borrow = require('../models/Borrow');
const Equipment = require('../models/Equipment');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// GET all returns ไม่ได้login 
router.get('/getall', async (req, res) => {
  try {
    const returns = await Return.find({ username: req.user.username });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET returns ของผู้ใช้ที่ล็อกอิน
router.get('/getuser', authenticateToken, async (req, res) => {
  try {
    const returns = await Return.find({ username: req.user.username });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// POST คืนอุปกรณ์
router.post('/getall/create', authenticateToken, async (req, res) => {
  const { BorrowID } = req.body;

  try {
    // 1. หาข้อมูลการยืม
    const borrow = await Borrow.findOne({ BorrowID });
    if (!borrow) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการยืม' });
    }

    // 2. อัปเดตจำนวน Available คืนกลับไปยัง Equipment
    const equipment = await Equipment.findOne({ EID: borrow.EquipmentID });
    if (equipment) {
      equipment.Available += borrow.Quantity;
      await equipment.save();
    }

    // 3. อัปเดตฟิลด์ ReturnDate ใน borrow (ใช้วันที่คืนจริง)
    const returnDate = new Date();
    borrow.ReturnDate = returnDate;
    borrow.Returned = true; // กำหนดสถานะว่า คืนแล้ว
    await borrow.save();

    // 4. บันทึกข้อมูลการคืนในคอลเลกชัน Returns
    const lastReturn = await Return.findOne().sort({ ReturnID: -1 });

    const returnRecord = new Return({
      ReturnID: lastReturn ? lastReturn.ReturnID + 1 : 1,
      username: borrow.username,
      name: borrow.name,
      EquipmentID: borrow.EquipmentID,
      Quantity: borrow.Quantity,
      ReturnDate: returnDate,
      Created_At: new Date()
    });

    await returnRecord.save();

    res.status(201).json({ message: 'คืนอุปกรณ์สำเร็จ', return: returnRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการคืนอุปกรณ์', error: err.message });
  }
});



module.exports = router;
