// utils/ids.js
const prisma = require('../prisma');

async function nextUserId() {
  const m = await prisma.user.aggregate({ _max: { UserId: true } });
  return (m._max.UserId || 0) + 1;
}

async function nextEquipId() {
  const m = await prisma.equipment.aggregate({ _max: { EID: true } });
  return (m._max.EID || 0) + 1;
}

async function nextBorrowId() {
  const m = await prisma.borrow.aggregate({ _max: { BorrowID: true } });
  return (m._max.BorrowID || 0) + 1;
}

async function nextReturnId() {
  const m = await prisma.return.aggregate({ _max: { ReturnID: true } });
  return (m._max.ReturnID || 0) + 1;
}

module.exports = {
  nextUserId,
  nextEquipId,
  nextBorrowId,
  nextReturnId,
};
