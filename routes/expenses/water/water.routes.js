const express = require('express');
const prisma = require('../../../src/prisma');
const router = express.Router();

const WATER_RATE = Number(process.env.WATER_RATE);

function generateId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()}-${r()}-${r()}`;
}

// GET /expenses/water/getall?q=YYYY-MM&page=1&pageSize=50
router.get('/getall', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));

    const where = q ? { Wmonth: { contains: q, mode: 'insensitive' } } : undefined;

    const [items, total] = await prisma.$transaction([
      prisma.water.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }]
      }),
      prisma.water.count({ where })
    ]);

    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /expenses/water/getall/latest
router.get('/getall/latest', async (_req, res) => {
  try {
    const latest = await prisma.water.findFirst({ orderBy: { createdAt: 'desc' } });
    res.json(latest ?? null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /expenses/water/getall/create  { Wmonth, Wmeter }
router.post('/getall/create', async (req, res) => {
  try {
    const { Wmonth, Wmeter } = req.body;
    if (!Wmonth || typeof Wmeter !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุ Wmonth (string) และ Wmeter (number)' });
    }
    if (Wmeter < 0) return res.status(400).json({ message: 'Wmeter ต้องเป็นค่าบวกหรือศูนย์' });

    const prev = await prisma.water.findFirst({ orderBy: { createdAt: 'desc' } });
    const prevMeter = prev ? prev.Wmeter : 0;

    const Wunits = Wmeter - prevMeter;
    if (Wunits < 0) return res.status(400).json({ message: 'Wmeter ต้องไม่ต่ำกว่าเดือนก่อน' });

    const Wprice = Wunits * WATER_RATE;

    const created = await prisma.water.create({
      data: {
        Wid: generateId(),
        Wmonth,
        Wmeter,
        WprevMeter: prevMeter,
        Wunits,
        Wprice,
        createdAt: new Date()
      }
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// PUT /expenses/water/getall/:Wid  { Wmonth?, Wmeter? }
router.put('/getall/:Wid', async (req, res) => {
  try {
    const { Wid } = req.params;
    const { Wmonth, Wmeter } = req.body;

    const current = await prisma.water.findUnique({ where: { Wid } });
    if (!current) return res.status(404).json({ message: 'ไม่พบรายการ' });

    const prevRec = await prisma.water.findFirst({
      where: { createdAt: { lt: current.createdAt } },
      orderBy: { createdAt: 'desc' }
    });
    const prevMeter = prevRec ? prevRec.Wmeter : 0;

    const newMeter = (typeof Wmeter === 'number') ? Wmeter : current.Wmeter;
    if (newMeter < 0) return res.status(400).json({ message: 'Wmeter ต้องเป็นค่าบวกหรือศูนย์' });

    const Wunits = newMeter - prevMeter;
    if (Wunits < 0) return res.status(400).json({ message: 'Wmeter ต้องไม่ต่ำกว่าเดือนก่อน' });

    const Wprice = Wunits * WATER_RATE;

    const updated = await prisma.water.update({
      where: { Wid },
      data: {
        Wmonth: Wmonth ?? current.Wmonth,
        Wmeter: newMeter,
        WprevMeter: prevMeter,
        Wunits,
        Wprice
      }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// DELETE /expenses/water/getall/:Wid
router.delete('/getall/:Wid', async (req, res) => {
  try {
    const { Wid } = req.params;
    await prisma.water.delete({ where: { Wid } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'ไม่พบรายการ' });
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;
