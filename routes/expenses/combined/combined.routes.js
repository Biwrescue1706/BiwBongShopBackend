// routes/expenses/combined.routes.js
const express = require('express');
const prisma = require('../../../src/prisma');
const router = express.Router();

const ELEC_RATE = Number(process.env.ELEC_RATE) || 8;
const WATER_RATE = Number(process.env.WATER_RATE) || 19;

// -------- Utils --------
function genId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()}-${r()}-${r()}`;
}

// รับ "2025-08", "2025-08-01", Date, หรือไม่ส่งมาเลย → คืน "YYYY-MM-25"
function normalizeMonth(input) {
  const d = input ? new Date(input) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-25`;
}

// -------- Routes --------

// POST /expenses/combined/create
router.post('/create', async (req, res) => {
  try {
    let { Emonth, Emeter, Wmonth, Wmeter } = req.body ?? {};

    if (typeof Emeter !== 'number' || typeof Wmeter !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุ Emeter และ Wmeter เป็นตัวเลข' });
    }
    if (Emeter < 0 || Wmeter < 0) {
      return res.status(400).json({ message: 'มิเตอร์ต้องเป็นค่าบวกหรือศูนย์' });
    }

    // บังคับเป็นวันที่ 25 ของเดือน (ถ้าไม่ส่งมาก็ใช้เดือนปัจจุบัน)
    Emonth = normalizeMonth(Emonth);
    Wmonth = normalizeMonth(Wmonth);

    // บังคับให้เป็นเดือนเดียวกัน เพราะเป็น combined เอนด์พอยต์
    if (Emonth !== Wmonth) {
      return res.status(400).json({ message: 'Emonth และ Wmonth ต้องเป็นเดือนเดียวกัน' });
    }

    const targetMonth = Emonth; // หรือ Wmonth ก็เท่ากันแล้ว

    const result = await prisma.$transaction(async (tx) => {
      // กันบันทึกซ้ำ (เดือนเดิม)
      const [dupE, dupW] = await Promise.all([
        tx.electricity.findFirst({ where: { Emonth: targetMonth } }),
        tx.water.findFirst({ where: { Wmonth: targetMonth } }),
      ]);

      if (dupE || dupW) {
        throw new Error(`เดือน ${targetMonth} มีการบันทึกอยู่แล้ว`);
      }

      // ===== ไฟฟ้า =====
      // หา record ก่อนหน้า โดยเรียงตาม Emonth (string YYYY-MM-25 เรียง lexicographic ได้)
      const prevElec = await tx.electricity.findFirst({
        where: { Emonth: { lt: targetMonth } },
        orderBy: { Emonth: 'desc' },
      });
      const prevEmeter = prevElec ? prevElec.Emeter : 0;
      const Eunits = Emeter - prevEmeter;
      if (Eunits < 0) throw new Error('Emeter ต้องไม่ต่ำกว่าเดือนก่อน');
      const Eprice = Eunits * ELEC_RATE;

      const electricity = await tx.electricity.create({
        data: {
          Eid: genId(),
          Emonth: targetMonth,
          Emeter,
          EprevMeter: prevEmeter,
          Eunits,
          Eprice,
          createdAt: new Date(),
        },
      });

      // ===== น้ำ =====
      const prevWater = await tx.water.findFirst({
        where: { Wmonth: { lt: targetMonth } },
        orderBy: { Wmonth: 'desc' },
      });
      const prevWmeter = prevWater ? prevWater.Wmeter : 0;
      const Wunits = Wmeter - prevWmeter;
      if (Wunits < 0) throw new Error('Wmeter ต้องไม่ต่ำกว่าเดือนก่อน');
      const Wprice = Wunits * WATER_RATE;

      const water = await tx.water.create({
        data: {
          Wid: genId(),
          Wmonth: targetMonth,
          Wmeter,
          WprevMeter: prevWmeter,
          Wunits,
          Wprice,
          createdAt: new Date(),
        },
      });

      return { electricity, water };
    });

    return res.status(201).json({
      message: 'บันทึกค่าไฟและค่าน้ำสำเร็จ',
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: String(err.message || err) });
  }
});

// GET /expenses/combined/getall  → รวมยอดตามเดือน (ไฟ + น้ำ)
router.get('/getall', async (_req, res) => {
  try {
    const [elec, wat] = await Promise.all([
      prisma.electricity.findMany({ orderBy: { Emonth: 'desc' } }),
      prisma.water.findMany({ orderBy: { Wmonth: 'desc' } }),
    ]);

    const map = new Map();

    for (const e of elec) {
      const month = e.Emonth;
      if (!map.has(month)) map.set(month, { month, electricity: 0, water: 0, total: 0 });
      const row = map.get(month);
      row.electricity += e.Eprice;
      row.total += e.Eprice;
    }

    for (const w of wat) {
      const month = w.Wmonth;
      if (!map.has(month)) map.set(month, { month, electricity: 0, water: 0, total: 0 });
      const row = map.get(month);
      row.water += w.Wprice;
      row.total += w.Wprice;
    }

    const combined = Array.from(map.values()).sort((a, b) => (a.month > b.month ? -1 : 1));
    return res.json(combined);
  } catch (err) {
    return res.status(500).json({ message: String(err.message || err) });
  }
});

module.exports = router;
