// routes/borrows.routes.js
const express = require('express');
const Borrow = require('../models/Borrow');
const Equipment = require('../models/Equipment');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/getall', async (req, res) => {
  try {
    const borrows = await Borrow.find();
    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET borrow by BorrowID
router.get('/:borrowId', authenticateToken, async (req, res) => {
  try {
    const borrowId = parseInt(req.params.borrowId, 10);
    const borrow = await Borrow.findOne({ BorrowID: borrowId, username: req.user.username });
    if (!borrow) return res.status(404).json({ message: 'ไม่พบข้อมูลการยืม' });
    res.json(borrow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST borrow new equipment
router.post('/create', authenticateToken, async (req, res) => {
  const { EquipmentID, Quantity } = req.body;  // ตัด ReturnDate ออก
  try {
    const equipment = await Equipment.findOne({ EID: EquipmentID });
    if (!equipment || equipment.Available < Quantity) {
      return res.status(400).json({ message: "จำนวนอุปกรณ์ไม่พอ" });
    }

    equipment.Available -= Quantity;
    await equipment.save();

    const last = await Borrow.findOne().sort({ BorrowID: -1 });

    const borrow = new Borrow({
      BorrowID: last ? last.BorrowID + 1 : 1,
      username: req.user.username,
      name: req.user.name,
      EquipmentID,
      Quantity,
      Date: new Date(),
      ReturnDate: null,  // หรือ กำหนดเป็น null หรือวันที่กำหนดเองที่นี่
      Returned: false
    });

    await borrow.save();
    res.status(201).json(borrow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
