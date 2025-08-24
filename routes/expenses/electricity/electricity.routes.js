// routes/expenses/electricity/electricity.routes.js
const express = require('express');
const prisma = require('../../../src/prisma'); // จาก expenses/electricity → src
const router = express.Router();

const ELEC_RATE = Number(process.env.ELEC_RATE) || 8;

// ---------- Utils ----------
function generateId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()}-${r()}-${r()}`;
}

// รับ "2025-08", "2025-08-01", Date ฯลฯ → คืน "YYYY-MM-25"
function normalizeMonth(input) {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) throw new Error('รูปแบบ Emonth ไม่ถูกต้อง');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-25`;
}

// ปรับค่าของรายการตั้งแต่เดือนที่มากกว่า startMonth ไปข้างหน้า
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
      data: { EprevMeter: prevMeter, Eunits, Eprice },
    });
    prevMeter = it.Emeter;
  }
}

// ---------- Routes ----------

// GET /expenses/electricity/getall?q=YYYY-MM&page=1&pageSize=50
// 👉 เรียงเดือน ม.ค. → ธ.ค. ด้วย Emonth ASC
router.get('/getall', async (req, res) => {
  try {
    const [items, total] = await prisma.$transaction([
      prisma.electricity.findMany({
        where,
        orderBy: [{ Emonth: 'asc' }], // 🔹 เรียง ม.ค. → ธ.ค.
      }),
      prisma.electricity.count({ where }),
    ]);

    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /expenses/electricity/getall/latest
// ใช้ Emonth desc เพื่อให้ได้เดือนล่าสุดจริง
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

// POST /expenses/electricity/getall/create  { Emonth, Emeter }
router.post('/getall/create', async (req, res) => {
  try {
    let { Emonth, Emeter } = req.body;
    if (typeof Emeter !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุ Emeter (number)' });
    }
    if (Emeter < 0) return res.status(400).json({ message: 'Emeter ต้องเป็นค่าบวกหรือศูนย์' });

    const targetMonth = normalizeMonth(Emonth);

    const created = await prisma.$transaction(async (tx) => {
      // กันซ้ำเดือนเดิม
      const dup = await tx.electricity.findFirst({ where: { Emonth: targetMonth } });
      if (dup) throw new Error(`เดือน ${targetMonth} ถูกบันทึกไว้แล้ว`);

      // หาเดือนก่อนหน้าโดยเทียบ Emonth
      const prev = await tx.electricity.findFirst({
        where: { Emonth: { lt: targetMonth } },
        orderBy: { Emonth: 'desc' },
      });
      const prevMeter = prev ? prev.Emeter : 0;

      const Eunits = Emeter - prevMeter;
      if (Eunits < 0) {
        return res.status(400).json({ message: 'Emeter ต้องไม่ต่ำกว่าเดือนก่อน' });
      }

      const Eprice = Eunits * ELEC_RATE;

      const row = await tx.electricity.create({
        data: {
          Eid: generateId(),
          Emonth: targetMonth,
          Emeter,
          EprevMeter: prevMeter,
          Eunits,
          Eprice,
          createdAt: new Date(),
        },
      });

      // ถ้าแทรกกลาง (มีเดือนที่มากกว่า targetMonth อยู่แล้ว) → ต้อง cascade
      const hasNext = await tx.electricity.findFirst({
        where: { Emonth: { gt: targetMonth } },
        select: { Eid: true },
      });
      if (hasNext) {
        await cascadeRecalculate(tx, targetMonth, Emeter);
      }

      return row;
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
    let { Emonth, Emeter } = req.body;

    const current = await prisma.electricity.findUnique({ where: { Eid } });
    if (!current) return res.status(404).json({ message: 'ไม่พบรายการ' });

    const newMonth = Emonth ? normalizeMonth(Emonth) : current.Emonth;

    // ห้ามซ้ำเดือน (ยกเว้นตัวเอง)
    if (newMonth !== current.Emonth) {
      const dup = await prisma.electricity.findFirst({
        where: { Emonth: newMonth, NOT: { Eid } },
      });
      if (dup) return res.status(400).json({ message: `เดือน ${newMonth} ถูกบันทึกไว้แล้ว` });
    }

    const newMeter = typeof Emeter === 'number' ? Emeter : current.Emeter;
    if (newMeter < 0) return res.status(400).json({ message: 'Emeter ต้องเป็นค่าบวกหรือศูนย์' });

    const updated = await prisma.$transaction(async (tx) => {
      // หาเดือนก่อนหน้าตาม newMonth (ไม่นับตัวเอง)
      const prevRec = await tx.electricity.findFirst({
        where: { Emonth: { lt: newMonth }, NOT: { Eid } },
        orderBy: { Emonth: 'desc' },
      });
      const prevMeter = prevRec ? prevRec.Emeter : 0;

      const Eunits = newMeter - prevMeter;
      if (Eunits < 0) throw new Error('Emeter ต้องไม่ต่ำกว่าเดือนก่อน');

      const Eprice = Eunits * ELEC_RATE;

      // อัปเดต record นี้
      const row = await tx.electricity.update({
        where: { Eid },
        data: {
          Emonth: newMonth,
          Emeter: newMeter,
          EprevMeter: prevMeter,
          Eunits,
          Eprice,
        },
      });

      // cascade คำนวณเดือนถัดไปใหม่
      await cascadeRecalculate(tx, newMonth, newMeter);

      return row;
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

    await prisma.$transaction(async (tx) => {
      const cur = await tx.electricity.findUnique({ where: { Eid } });
      if (!cur) throw Object.assign(new Error('ไม่พบรายการ'), { code: 'P2025' });

      // หาเดือนก่อนหน้าเพื่อตั้งต้น cascade
      const prevRec = await tx.electricity.findFirst({
        where: { Emonth: { lt: cur.Emonth }, NOT: { Eid } },
        orderBy: { Emonth: 'desc' },
        select: { Emeter: true, Emonth: true },
      });
      const prevMeter = prevRec ? prevRec.Emeter : 0;
      const prevMonth = prevRec ? prevRec.Emonth : cur.Emonth;

      await tx.electricity.delete({ where: { Eid } });

      // cascade: คำนวณใหม่ตั้งแต่เดือนถัดไป
      await cascadeRecalculate(tx, prevMonth, prevMeter);
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'ไม่พบรายการ' });
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;
