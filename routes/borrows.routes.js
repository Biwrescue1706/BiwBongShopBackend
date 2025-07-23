// routes/borrows.routes.js
const express = require('express');
const Borrow = require('../models/Borrow');
const Equipment = require('../models/Equipment');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/getall', async (req, res) => {
  try {
    const borrows = await Borrow.find();
    res.json({ message: "ประวัติการยืมทั้งหมด", borrows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET borrow by BorrowID
router.get('/getall/:borrowId', async (req, res) => {
  try {
    const borrowId = parseInt(req.params.borrowId, 10);
    const borrow = await Borrow.findOne({ BorrowID: borrowId });
    if (!borrow) return res.status(404).json({ message: 'ไม่พบข้อมูลการยืม' });
    res.json({ message: `ประวัติการยืม คนที่ ${borrowId}`, borrow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST borrow new equipment
router.post('/getall/create', authenticateToken, async (req, res) => {
  const { EquipmentID, Quantity, names } = req.body;

  if (!names || typeof names !== 'string' || names.trim() === '') {
    return res.status(400).json({ message: 'กรุณาระบุชื่อผู้ยืม' });
  }

  if (!Number.isInteger(Quantity) || Quantity <= 0) {
    return res.status(400).json({ message: 'จำนวนที่ยืมต้องเป็นจำนวนเต็มบวก' });
  }

  try {
    const equipment = await Equipment.findOne({ EID: EquipmentID });
    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    if (equipment.Available < Quantity) {
      return res.status(400).json({ message: 'จำนวนอุปกรณ์ไม่พอ' });
    }

    equipment.Available -= Quantity;
    await equipment.save();

    const lastBorrow = await Borrow.findOne().sort({ BorrowID: -1 });
    const newBorrowID = lastBorrow ? lastBorrow.BorrowID + 1 : 1;

    const borrow = new Borrow({
      BorrowID: newBorrowID,
      username: req.user.username,
      name: req.user.name,
      names: names.trim(),
      EquipmentID,
      EName: equipment.EName,
      Quantity,
      ReturnedQuantity: 0,
      Date: new Date(),
      ReturnDate: null,
      Returned: false,
      Created_At: new Date()
    });

    await borrow.save();

    res.status(201).json({ message: 'ยืมอุปกรณ์สำเร็จ', borrow });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
