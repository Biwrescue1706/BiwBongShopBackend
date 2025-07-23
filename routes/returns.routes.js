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
    const returns = await Return.find().select(' -_id -__v');
    res.json({message: "ประวัติการคืนทั้งหมด",returns});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET returns ของผู้ใช้ที่ล็อกอิน
router.get('/getuser', async (req, res) => {
  try {
    const returns = await Return.find().select(' -_id -__v');;
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// POST คืนอุปกรณ์
router.post('/getall/create', authenticateToken, async (req, res) => {
  const { BorrowID, returnQuantity } = req.body; // เพิ่ม field ที่ผู้ใช้ส่งมา

  try {
    const borrow = await Borrow.findOne({ BorrowID });
    if (!borrow) return res.status(404).json({ message: 'ไม่พบข้อมูลการยืม' });

    const remainingQty = borrow.Quantity - borrow.ReturnedQuantity;
    if (returnQuantity > remainingQty) {
      return res.status(400).json({ message: `คุณสามารถคืนได้ไม่เกิน ${remainingQty} ชิ้น` });
    }

    // อัปเดตจำนวนใน Equipment
    const equipment = await Equipment.findOne({ EID: borrow.EquipmentID });
    if (equipment) {
      equipment.Available += returnQuantity;
      await equipment.save();
    }

    // อัปเดตใน Borrow
    borrow.ReturnedQuantity += returnQuantity;
    if (borrow.ReturnedQuantity >= borrow.Quantity) {
      borrow.Returned = true;
      borrow.ReturnDate = new Date();
    }
    await borrow.save();

    // สร้าง Record การคืน
    const lastReturn = await Return.findOne().sort({ ReturnID: -1 });
    const returnRecord = new Return({
      ReturnID: lastReturn ? lastReturn.ReturnID + 1 : 1,
      BorrowID: borrow.BorrowID,
      username: borrow.username,
      name: borrow.name,
      names: borrow.names,
      EquipmentID: borrow.EquipmentID,
      Ename: borrow.EName,
      Quantity: returnQuantity,
      ReturnDate: new Date(),
      Created_At: new Date()
    });

    await returnRecord.save();

    res.status(201).json({ message: 'คืนอุปกรณ์บางส่วนสำเร็จ', return: returnRecord });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการคืนอุปกรณ์', error: err.message });
  }
});

module.exports = router;
