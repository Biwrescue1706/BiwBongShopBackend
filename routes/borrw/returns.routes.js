// routes/borrw/returns.routes.js
const express = require('express');
const prisma = require('../../src/prisma');
const authenticateToken = require('../../middleware/authenticateToken');
const { nextReturnId } = require('../../src/utils/ids');

const router = express.Router();

//ดูประวัติการคืนทั้งหมด (สาธารณะ)
router.get('/getall', async (_req, res) => {
  try {
    const returns = await prisma.return.findMany({
      orderBy: { Created_At: 'desc' }
    });
    res.json({ message: 'ประวัติการคืนทั้งหมด', returns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ดูประวัติการคืนของผู้ใช้ที่ล็อกอิน
router.get('/getuser', authenticateToken, async (req, res) => {
  try {
    const returns = await prisma.return.findMany({
      where: { username: req.user.username },
      orderBy: { Created_At: 'desc' }
    });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// คืนอุปกรณ์แบบบางส่วน/ครบ (ต้องล็อกอิน)
router.post('/getall/create', authenticateToken, async (req, res) => {
  const { BorrowID, returnQuantity } = req.body;

  if (!Number.isInteger(returnQuantity) || returnQuantity <= 0) {
    return res.status(400).json({ message: 'จำนวนที่คืนต้องเป็นจำนวนเต็มบวก' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // หา Borrow
      const borrow = await tx.borrow.findUnique({
        where: { BorrowID: Number(BorrowID) }
      });
      if (!borrow) throw new Error('ไม่พบข้อมูลการยืม');

      const remaining = borrow.Quantity - borrow.ReturnedQuantity;
      if (returnQuantity > remaining) {
        throw new Error(`คุณสามารถคืนได้ไม่เกิน ${remaining} ชิ้น`);
      }

      // อัปเดต Equipment.Available
      const eq = await tx.equipment.findUnique({ where: { EID: borrow.EquipmentID } });
      if (eq) {
        await tx.equipment.update({
          where: { EID: eq.EID },
          data: { Available: eq.Available + returnQuantity }
        });
      }

      // อัปเดตสถานะ Borrow
      const newReturned = borrow.ReturnedQuantity + returnQuantity;
      const done = newReturned >= borrow.Quantity;
      await tx.borrow.update({
        where: { BorrowID: borrow.BorrowID },
        data: {
          ReturnedQuantity: newReturned,
          Returned: done,
          ReturnDate: done ? new Date() : borrow.ReturnDate,
          Update_At: new Date()
        }
      });

      // สร้าง Return record
      const createdReturn = await tx.return.create({
        data: {
          ReturnID: await nextReturnId(),
          BorrowID: borrow.BorrowID,
          username: borrow.username,
          name: borrow.name,
          names: borrow.names,
          EquipmentID: borrow.EquipmentID,
          Ename: borrow.EName,
          Quantity: returnQuantity,
          ReturnDate: new Date(),
          Created_At: new Date()
        }
      });

      return createdReturn;
    });

    res.status(201).json({ message: 'คืนอุปกรณ์บางส่วนสำเร็จ', return: result });
  } catch (err) {
    const known = ['ไม่พบข้อมูลการยืม', 'คุณสามารถคืนได้ไม่เกิน'];
    const msg = known.some(k => err.message.startsWith(k)) ? err.message : 'เกิดข้อผิดพลาดในการคืนอุปกรณ์';
    res.status(500).json({ message: msg, error: err.message });
  }
});

module.exports = router;
