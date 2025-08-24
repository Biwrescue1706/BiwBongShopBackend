const express = require('express');
const prisma = require('../../../src/prisma');
const router = express.Router();

const ELEC_RATE = Number(process.env.ELEC_RATE) || 8;
const WATER_RATE = Number(process.env.WATER_RATE) || 19;

function genId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()}-${r()}-${r()}`;
}

// POST /expenses/combined/create
// body: { Emonth, Emeter, Wmonth, Wmeter }
router.post('/create', async (req, res) => {
  try {
    const { Emonth, Emeter, Wmonth, Wmeter } = req.body;
    if (!Emonth || typeof Emeter !== 'number' || !Wmonth || typeof Wmeter !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุ Emonth, Emeter, Wmonth, Wmeter ให้ครบ' });
    }
    if (Emeter < 0 || Wmeter < 0) return res.status(400).json({ message: 'มิเตอร์ต้องเป็นค่าบวกหรือศูนย์' });

    const result = await prisma.$transaction(async (tx) => {
      // ไฟ
      const prevElec = await tx.electricity.findFirst({ orderBy: { createdAt: 'desc' } });
      const prevEmeter = prevElec ? prevElec.Emeter : 0;
      const Eunits = Emeter - prevEmeter;
      if (Eunits < 0) throw new Error('Emeter ต้องไม่ต่ำกว่าเดือนก่อน');
      const Eprice = Eunits * ELEC_RATE;

      const electricity = await tx.electricity.create({
        data: {
          Eid: genId(),
          Emonth,
          Emeter,
          EprevMeter: prevEmeter,
          Eunits,
          Eprice,
          createdAt: new Date()
        }
      });

      // น้ำ
      const prevWater = await tx.water.findFirst({ orderBy: { createdAt: 'desc' } });
      const prevWmeter = prevWater ? prevWater.Wmeter : 0;
      const Wunits = Wmeter - prevWmeter;
      if (Wunits < 0) throw new Error('Wmeter ต้องไม่ต่ำกว่าเดือนก่อน');
      const Wprice = Wunits * WATER_RATE;

      const water = await tx.water.create({
        data: {
          Wid: genId(),
          Wmonth,
          Wmeter,
          WprevMeter: prevWmeter,
          Wunits,
          Wprice,
          createdAt: new Date()
        }
      });

      return { electricity, water };
    });

    res.status(201).json({ message: 'บันทึกค่าไฟและค่าน้ำสำเร็จ', ...result });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// GET /expenses/combined/getall  → รวมยอดตามเดือน
router.get('/getall', async (_req, res) => {
  try {
    const [elec, wat] = await Promise.all([
      prisma.electricity.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.water.findMany({ orderBy: { createdAt: 'desc' } }),
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

    // เรียงเดือนใหม่สุดอยู่บน (ตาม key ที่มี)
    const combined = Array.from(map.values()).sort((a, b) => (a.month > b.month ? -1 : 1));
    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
