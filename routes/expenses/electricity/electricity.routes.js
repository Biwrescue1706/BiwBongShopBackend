// routes/expenses/electricity/electricity.routes.js
const express = require('express');
const prisma = require('../../../src/prisma');
const router = express.Router();

const ELEC_RATE = Number(process.env.ELEC_RATE) || 8;

/* ========================= Utils ========================= */
function generateId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()}-${r()}-${r()}`;
}

function normalizeMonth(input) {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) throw new Error('รูปแบบ Emonth ไม่ถูกต้อง');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-25`;
}

async function cascadeRecalculate(tx, startMonth, startMeter) {
  const nextItems = await tx.electricity.findMany({
    where: { Emonth: { gt: startMonth } },
    orderBy: { Emonth: 'asc' },
    select: { Eid: true, Emonth: true, Emeter: true },
  });

  let prevMeter = startMeter;
  for (const it of nextItems) {
    const Eunits = it.Emeter - prevMeter;
    if (Eunits < 0) {
      throw new Error(
        `Emeter ของเดือน ${it.Emonth} (${it.Emeter}) ต้องไม่ต่ำกว่าเดือนก่อนหน้า (${prevMeter})`
      );
    }
    const Eprice = Eunits * ELEC_RATE;
    await tx.electricity.update({
      where: { Eid: it.Eid },
      data: { EprevMeter: prevMeter, Eunits, Eprice, updatedAt: new Date() },
    });
    prevMeter = it.Emeter;
  }
}

/* ========================= Routes ======================= */

// GET /expenses/electricity/getall
router.get('/getall', async (req, res) => {
  try {
    const { q } = req.query;
    let where = {};

    if (typeof q === 'string' && q.trim()) {
      const s = q.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) where = { Emonth: s };
      else if (/^\d{4}-\d{2}$/.test(s)) where = { Emonth: { startsWith: s } };
    }

    const items = await prisma.electricity.findMany({
      where,
      orderBy: [{ Emonth: 'asc' }],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /expenses/electricity/getall/latest
router.get('/getall/latest', async (_req, res) => {
  try {
    const latest = await prisma.electricity.findFirst({
      orderBy: [{ Emonth: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(latest ?? null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /expenses/electricity/getall/:Eid
router.put('/getall/:Eid', async (req, res) => {
  try {
    const { Eid } = req.params;
    let { Emonth, Emeter, EprevMeter, createdAt } = req.body;

    const current = await prisma.electricity.findUnique({ where: { Eid } });
    if (!current) return res.status(404).json({ message: 'ไม่พบรายการ' });

    // === newMonth ===
    const newMonth = (Emonth !== undefined && Emonth !== null)
      ? normalizeMonth(Emonth)
      : current.Emonth;

    if (newMonth !== current.Emonth) {
      const dup = await prisma.electricity.findFirst({
        where: { Emonth: newMonth, NOT: { Eid } },
      });
      if (dup) return res.status(400).json({ message: `เดือน ${newMonth} ถูกบันทึกไว้แล้ว` });
    }

    // === newMeter ===
    const newMeter = (typeof Emeter === 'number') ? Emeter : current.Emeter;
    if (newMeter < 0) return res.status(400).json({ message: 'Emeter ต้องเป็นค่าบวกหรือศูนย์' });

    // === prevMeter ===
    let prevMeter;
    let usedProvidedPrev = false;

    if (typeof EprevMeter === 'number') {
      if (EprevMeter < 0) return res.status(400).json({ message: 'EprevMeter ต้องเป็นค่าบวกหรือศูนย์' });
      if (EprevMeter > newMeter) return res.status(400).json({ message: 'EprevMeter ต้องไม่มากกว่า Emeter' });
      prevMeter = EprevMeter;
      usedProvidedPrev = true;
    } else {
      const prevRec = await prisma.electricity.findFirst({
        where: { Emonth: { lt: newMonth }, NOT: { Eid } },
        orderBy: { Emonth: 'desc' },
        select: { Emeter: true, Emonth: true },
      });
      prevMeter = prevRec ? prevRec.Emeter : 0;
    }

    const Eunits = newMeter - prevMeter;
    if (Eunits < 0) return res.status(400).json({ message: 'Emeter ต้องไม่ต่ำกว่าเดือนก่อน' });

    const Eprice = Eunits * ELEC_RATE;

    // === patch data ===
    const patch = {
      Emonth: newMonth,
      Emeter: newMeter,
      EprevMeter: prevMeter,
      Eunits,
      Eprice,
      updatedAt: new Date(),
    };

    // อนุญาตแก้ createdAt ถ้ามีส่งมา
    if (createdAt !== undefined && createdAt !== null) {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: 'รูปแบบ createdAt ไม่ถูกต้อง' });
      }
      patch.createdAt = d;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.electricity.update({
        where: { Eid },
        data: patch,
      });

      // cascade เฉพาะกรณีที่ chain มีผล
      if (newMonth !== current.Emonth || newMeter !== current.Emeter || usedProvidedPrev) {
        await cascadeRecalculate(tx, newMonth, newMeter);
      }

      return row;
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// DELETE /expenses/electricity/getall/:Eid
router.delete('/getall/:Eid', async (req, res) => {
  try {
    const { Eid } = req.params;

    await prisma.$transaction(async (tx) => {
      const cur = await tx.electricity.findUnique({ where: { Eid } });
      if (!cur) throw Object.assign(new Error('ไม่พบรายการ'), { code: 'P2025' });

      const prevRec = await tx.electricity.findFirst({
        where: { Emonth: { lt: cur.Emonth }, NOT: { Eid } },
        orderBy: { Emonth: 'desc' },
        select: { Emeter: true, Emonth: true },
      });
      const prevMeter = prevRec ? prevRec.Emeter : 0;
      const prevMonth = prevRec ? prevRec.Emonth : cur.Emonth;

      await tx.electricity.delete({ where: { Eid } });

      await cascadeRecalculate(tx, prevMonth, prevMeter);
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'ไม่พบรายการ' });
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;
