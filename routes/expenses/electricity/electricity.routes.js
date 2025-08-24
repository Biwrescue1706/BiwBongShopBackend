const express = require('express');
const prisma = require('../../../src/prisma'); // จาก expenses/electricity → src
const router = express.Router();

const ELEC_RATE = Number(process.env.ELEC_RATE);

function generateId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()}-${r()}-${r()}`;
}

// GET /expenses/electricity/getall?q=YYYY-MM&page=1&pageSize=50
router.get('/getall', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));

    const where = q ? { Emonth: { contains: q, mode: 'insensitive' } } : undefined;

    const [items, total] = await prisma.$transaction([
      prisma.electricity.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }]
      }),
      prisma.electricity.count({ where })
    ]);

    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /expenses/electricity/getall/latest
router.get('/getall/latest', async (_req, res) => {
  try {
    const latest = await prisma.electricity.findFirst({ orderBy: { createdAt: 'desc' } });
    res.json(latest ?? null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /expenses/electricity/getall/create  { Emonth, Emeter }
router.post('/getall/create', async (req, res) => {
  try {
    const { Emonth, Emeter } = req.body;
    if (!Emonth || typeof Emeter !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุ Emonth (string) และ Emeter (number)' });
    }
    if (Emeter < 0) return res.status(400).json({ message: 'Emeter ต้องเป็นค่าบวกหรือศูนย์' });

    const prev = await prisma.electricity.findFirst({ orderBy: { createdAt: 'desc' } });
    const prevMeter = prev ? prev.Emeter : 0;

    const Eunits = Emeter - prevMeter;
    if (Eunits < 0) return res.status(400).json({ message: 'Emeter ต้องไม่ต่ำกว่าเดือนก่อน' });

    const Eprice = Eunits * ELEC_RATE;

    const created = await prisma.electricity.create({
      data: {
        Eid: generateId(),
        Emonth,
        Emeter,
        EprevMeter: prevMeter,
        Eunits,
        Eprice,
        createdAt: new Date()
      }
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// PUT /expenses/electricity/getall/:Eid  { Emonth?, Emeter? }
router.put('/getall/:Eid', async (req, res) => {
  try {
    const { Eid } = req.params;
    const { Emonth, Emeter } = req.body;

    const current = await prisma.electricity.findUnique({ where: { Eid } });
    if (!current) return res.status(404).json({ message: 'ไม่พบรายการ' });

    const prevRec = await prisma.electricity.findFirst({
      where: { createdAt: { lt: current.createdAt } },
      orderBy: { createdAt: 'desc' }
    });
    const prevMeter = prevRec ? prevRec.Emeter : 0;

    const newMeter = (typeof Emeter === 'number') ? Emeter : current.Emeter;
    if (newMeter < 0) return res.status(400).json({ message: 'Emeter ต้องเป็นค่าบวกหรือศูนย์' });

    const Eunits = newMeter - prevMeter;
    if (Eunits < 0) return res.status(400).json({ message: 'Emeter ต้องไม่ต่ำกว่าเดือนก่อน' });

    const Eprice = Eunits * ELEC_RATE;

    const updated = await prisma.electricity.update({
      where: { Eid },
      data: {
        Emonth: Emonth ?? current.Emonth,
        Emeter: newMeter,
        EprevMeter: prevMeter,
        Eunits,
        Eprice
      }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// DELETE /expenses/electricity/getall/:Eid
router.delete('/getall/:Eid', async (req, res) => {
  try {
    const { Eid } = req.params;
    await prisma.electricity.delete({ where: { Eid } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'ไม่พบรายการ' });
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;
