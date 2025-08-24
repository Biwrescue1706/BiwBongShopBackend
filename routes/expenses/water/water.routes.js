// routes/expenses/water/water.routes.js
const express = require('express');
const prisma = require('../../../src/prisma');
const router = express.Router();

const WATER_RATE = Number(process.env.WATER_RATE) || 19;

/* ========================= Utils ========================= */
function generateId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()}-${r()}-${r()}`;
}

// รับ "2025-08", "2025-08-01", Date ฯลฯ → คืน "YYYY-MM-25"
function normalizeMonth(input) {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) throw new Error('รูปแบบ Wmonth ไม่ถูกต้อง');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-25`;
}

// ปรับค่ารายการตั้งแต่เดือนที่มากกว่า startMonth ไปข้างหน้า
async function cascadeRecalculate(tx, startMonth, startMeter) {
  const nextItems = await tx.water.findMany({
    where: { Wmonth: { gt: startMonth } },
    orderBy: { Wmonth: 'asc' },
    select: { Wid: true, Wmonth: true, Wmeter: true },
  });

  let prevMeter = startMeter;
  for (const it of nextItems) {
    const Wunits = it.Wmeter - prevMeter;
    if (Wunits < 0) {
      throw new Error(
        `Wmeter ของเดือน ${it.Wmonth} (${it.Wmeter}) ต้องไม่ต่ำกว่าเดือนก่อนหน้า (${prevMeter})`
      );
    }
    const Wprice = Wunits * WATER_RATE;
    await tx.water.update({
      where: { Wid: it.Wid },
      data: { WprevMeter: prevMeter, Wunits, Wprice },
    });
    prevMeter = it.Wmeter;
  }
}

/* ========================= Routes ========================= */

// GET /expenses/water/getall?q=YYYY-MM|YYYY-MM-DD&page=1&pageSize=50
// เรียงเก่า → ใหม่ (ASC)
router.get('/getall', async (req, res) => {
  try {
    const { q } = req.query;
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 200)));

    // where จาก q: YYYY-MM จะ match เดือนนั้น, YYYY-MM-DD จะเท่ากันเป๊ะ
    let where = {};
    if (typeof q === 'string' && q.trim()) {
      const s = q.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        where = { Wmonth: s };
      } else if (/^\d{4}-\d{2}$/.test(s)) {
        where = { Wmonth: { startsWith: s } };
      }
    }

    const [items, total] = await prisma.$transaction([
      prisma.water.findMany({
        where,
        orderBy: [{ Wmonth: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.water.count({ where }),
    ]);

    res.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /expenses/water/getall/latest
// ใช้ Wmonth desc เพื่อให้ได้เดือนล่าสุดจริง
router.get('/getall/latest', async (_req, res) => {
  try {
    const latest = await prisma.water.findFirst({
      orderBy: [{ Wmonth: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(latest ?? null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /expenses/water/getall/create  { Wmonth, Wmeter, baselinePrevMeter? }
router.post('/getall/create', async (req, res) => {
  try {
    let { Wmonth, Wmeter, baselinePrevMeter } = req.body;
    if (typeof Wmeter !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุ Wmeter (number)' });
    }
    if (Wmeter < 0) {
      return res.status(400).json({ message: 'Wmeter ต้องเป็นค่าบวกหรือศูนย์' });
    }

    const targetMonth = normalizeMonth(Wmonth);

    const created = await prisma.$transaction(async (tx) => {
      // กันซ้ำเดือนเดิม
      const dup = await tx.water.findFirst({ where: { Wmonth: targetMonth } });
      if (dup) throw new Error(`เดือน ${targetMonth} ถูกบันทึกไว้แล้ว`);

      // หาเดือนก่อนหน้า
      const prev = await tx.water.findFirst({
        where: { Wmonth: { lt: targetMonth } },
        orderBy: { Wmonth: 'desc' },
      });

      let prevMeter = prev ? prev.Wmeter : 0;

      // ✅ อนุญาต baselinePrevMeter เฉพาะกรณี "ไม่มีเดือนก่อนหน้า"
      if (!prev && typeof baselinePrevMeter === 'number') {
        if (baselinePrevMeter < 0) throw new Error('baselinePrevMeter ต้องเป็นค่าบวกหรือศูนย์');
        if (baselinePrevMeter > Wmeter) throw new Error('baselinePrevMeter ต้องไม่มากกว่า Wmeter');
        prevMeter = baselinePrevMeter;
      }

      const Wunits = Wmeter - prevMeter;
      if (Wunits < 0) {
        return res.status(400).json({ message: 'Wmeter ต้องไม่ต่ำกว่าเดือนก่อน' });
      }

      const Wprice = Wunits * WATER_RATE;

      const row = await tx.water.create({
        data: {
          Wid: generateId(),
          Wmonth: targetMonth,
          Wmeter,
          WprevMeter: prevMeter,
          Wunits,
          Wprice,
          createdAt: new Date(),
        },
      });

      // ถ้าแทรกกลาง → cascade forward
      const hasNext = await tx.water.findFirst({
        where: { Wmonth: { gt: targetMonth } },
        select: { Wid: true },
      });
      if (hasNext) await cascadeRecalculate(tx, targetMonth, Wmeter);

      return row;
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// PUT /expenses/water/getall/:Wid
// Body: { Wmonth?, Wmeter?, WprevMeter?, allowPrevOverride? }
router.put('/getall/:Wid', async (req, res) => {
  try {
    const { Wid } = req.params;
    let { Wmonth, Wmeter, WprevMeter, allowPrevOverride } = req.body;

    const current = await prisma.water.findUnique({ where: { Wid } });
    if (!current) return res.status(404).json({ message: 'ไม่พบรายการ' });

    const newMonth = Wmonth ? normalizeMonth(Wmonth) : current.Wmonth;

    // กันซ้ำเดือน (ยกเว้นตัวเอง)
    if (newMonth !== current.Wmonth) {
      const dup = await prisma.water.findFirst({
        where: { Wmonth: newMonth, NOT: { Wid } },
      });
      if (dup) return res.status(400).json({ message: `เดือน ${newMonth} ถูกบันทึกไว้แล้ว` });
    }

    const newMeter = typeof Wmeter === 'number' ? Wmeter : current.Wmeter;
    if (newMeter < 0) return res.status(400).json({ message: 'Wmeter ต้องเป็นค่าบวกหรือศูนย์' });

    const updated = await prisma.$transaction(async (tx) => {
      // หาเดือนก่อนหน้าตามตำแหน่ง newMonth (ไม่นับตัวเอง)
      const prevRec = await tx.water.findFirst({
        where: { Wmonth: { lt: newMonth }, NOT: { Wid } },
        orderBy: { Wmonth: 'desc' },
        select: { Wmeter: true, Wmonth: true },
      });

      let prevMeter = prevRec ? prevRec.Wmeter : 0;

      // ✅ ยอมรับ override เมื่อส่ง allowPrevOverride=true
      if (allowPrevOverride === true && typeof WprevMeter === 'number') {
        if (WprevMeter < 0) throw new Error('WprevMeter ต้องเป็นค่าบวกหรือศูนย์');
        if (WprevMeter > newMeter) throw new Error('WprevMeter ต้องไม่มากกว่า Wmeter');

        // ถ้ามีเดือนก่อนอยู่ ต้องรักษา chain
        if (prevRec && WprevMeter !== prevRec.Wmeter) {
          throw new Error(
            `WprevMeter ต้องเท่ากับ Wmeter ของเดือนก่อนหน้า (${prevRec.Wmonth}: ${prevRec.Wmeter})`
          );
        }
        prevMeter = WprevMeter;
      }

      const Wunits = newMeter - prevMeter;
      if (Wunits < 0) throw new Error('Wmeter ต้องไม่ต่ำกว่าเดือนก่อน');

      const Wprice = Wunits * WATER_RATE;

      const row = await tx.water.update({
        where: { Wid },
        data: {
          Wmonth: newMonth,
          Wmeter: newMeter,
          WprevMeter: prevMeter,
          Wunits,
          Wprice,
        },
      });

      // cascade เดือนถัดไป
      await cascadeRecalculate(tx, newMonth, newMeter);

      return row;
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// DELETE /expenses/water/getall/:Wid
router.delete('/getall/:Wid', async (req, res) => {
  try {
    const { Wid } = req.params;

    await prisma.$transaction(async (tx) => {
      const cur = await tx.water.findUnique({ where: { Wid } });
      if (!cur) throw Object.assign(new Error('ไม่พบรายการ'), { code: 'P2025' });

      // หาเดือนก่อนหน้าเพื่อตั้งต้น cascade
      const prevRec = await tx.water.findFirst({
        where: { Wmonth: { lt: cur.Wmonth }, NOT: { Wid } },
        orderBy: { Wmonth: 'desc' },
        select: { Wmeter: true, Wmonth: true },
      });
      const prevMeter = prevRec ? prevRec.Wmeter : 0;
      const prevMonth = prevRec ? prevRec.Wmonth : cur.Wmonth;

      await tx.water.delete({ where: { Wid } });

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
