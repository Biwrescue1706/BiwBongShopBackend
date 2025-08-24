const express = require('express');
const prisma = require('../../src/prisma');                 // จาก routes/borrw → src
const authenticateToken = require('../../middleware/authenticateToken');
const { nextBorrowId } = require('../../src/utils/ids');

const router = express.Router();

// ดึงประวัติการยืมทั้งหมด
router.get('/getall', async (_req, res) => {
  try {
    const borrows = await prisma.borrow.findMany({
      orderBy: { BorrowID: 'asc' }
    });
    res.json({ message: 'ประวัติการยืมทั้งหมด', borrows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ดึงรายการยืมตาม BorrowID
router.get('/getall/:borrowId', async (req, res) => {
  try {
    const borrowId = Number.parseInt(req.params.borrowId, 10);
    const borrow = await prisma.borrow.findUnique({ where: { BorrowID: borrowId } });
    if (!borrow) return res.status(404).json({ message: 'ไม่พบข้อมูลการยืม' });
    res.json({ message: `ประวัติการยืม #${borrowId}`, borrow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ยืมอุปกรณ์ใหม่ (ต้อง login)
router.post('/getall/create', authenticateToken, async (req, res) => {
  const { EquipmentID, Quantity, names } = req.body;

  if (!names?.trim()) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อผู้ยืม' });
  }
  if (!Number.isInteger(Quantity) || Quantity <= 0) {
    return res.status(400).json({ message: 'จำนวนที่ยืมต้องเป็นจำนวนเต็มบวก' });
  }

  try {
    const borrow = await prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.findUnique({
        where: { EID: Number(EquipmentID) }
      });
      if (!equipment) throw new Error('ไม่พบอุปกรณ์');
      if (equipment.Available < Quantity) throw new Error('จำนวนอุปกรณ์ไม่พอ');

      await tx.equipment.update({
        where: { EID: equipment.EID },
        data: { Available: equipment.Available - Quantity }
      });

      return tx.borrow.create({
        data: {
          BorrowID: await nextBorrowId(),
          username: req.user.username,
          name: req.user.name,
          names: names.trim(),
          EquipmentID: equipment.EID,
          EName: equipment.EName,
          Quantity,
          ReturnedQuantity: 0,
          Date: new Date(),
          ReturnDate: null,
          Returned: false,
          Created_At: new Date()
        }
      });
    });

    res.status(201).json({ message: 'ยืมอุปกรณ์สำเร็จ', borrow });
  } catch (err) {
    const msg = ['ไม่พบอุปกรณ์', 'จำนวนอุปกรณ์ไม่พอ'].includes(err.message)
      ? err.message
      : 'เกิดข้อผิดพลาด';
    res.status(500).json({ message: msg, error: err.message });
  }
});

module.exports = router;
