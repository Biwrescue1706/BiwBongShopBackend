require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// ตรวจสอบ JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

// ตรวจสอบ .env
const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// import models
const User = require('./models/User');
const Equipment = require('./models/Equipment');
const Borrow = require('./models/Borrow');
const Return = require('./models/Return');
const authenticateToken = require('./middleware/authenticateToken');

//import routes
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const equipmentsRouter = require('./routes/equipments.routes');

const app = express();
app.use(cors({ origin: true, credentials: true }));

// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     'http://127.0.0.1:5500',
//     'https://biwrescue1706.github.io/BiwBong',
//     'https://biwbongbackend.onrender.com'
//   ],
//   credentials: true
// }));

app.use(express.json());
app.use(cookieParser());

// เชื่อมต่อ MongoDB
mongoose.connect(MONGO_URI, {
  dbName: 'BiwBongShop',
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB connected");
}).catch(err => {
  console.error("❌ MongoDB connection error:", err);
});

// Helper เพิ่ม UserId อัตโนมัติ
async function getNextUserId() {
  const lastUser = await User.findOne().sort({ UserId: -1 });
  return lastUser ? lastUser.UserId + 1 : 1;
}

// Routes

app.get('/', (req, res) => {
  res.send('Backend server is running');
});
app.use('/equipments', equipmentsRouter);
app.use('/user', authRoutes);
app.use('/users', usersRoutes);

// Borrow Routes
app.get('/borrow', async (req, res) => {
  try {
    const borrows = await Borrow.find();
    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/borrows', authenticateToken, async (req, res) => {
  const { EquipmentID, Quantity } = req.body;  // ตัด ReturnDate ออก
  try {
    const equipment = await Equipment.findOne({ EID: EquipmentID });
    if (!equipment || equipment.Available < Quantity) {
      return res.status(400).json({ message: "จำนวนอุปกรณ์ไม่พอ" });
    }

    equipment.Available -= Quantity;
    await equipment.save();

    const last = await Borrow.findOne().sort({ BorrowID: -1 });

    const borrow = new Borrow({
      BorrowID: last ? last.BorrowID + 1 : 1,
      username: req.user.username,
      name: req.user.name,
      EquipmentID,
      Quantity,
      Date: new Date(),
      ReturnDate: null,  // หรือ กำหนดเป็น null หรือวันที่กำหนดเองที่นี่
      Returned: false
    });

    await borrow.save();
    res.status(201).json(borrow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Return Routes
app.get('/return', async (req, res) => {
  try {
    const returns = await Return.find();
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/returns', authenticateToken, async (req, res) => {
  const { BorrowID } = req.body;

  try {
    // 1. หาข้อมูลการยืม
    const borrow = await Borrow.findOne({ BorrowID });
    if (!borrow) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการยืม' });
    }

    // 2. อัปเดตจำนวน Available คืนกลับไปยัง Equipment
    const equipment = await Equipment.findOne({ EID: borrow.EquipmentID });
    if (equipment) {
      equipment.Available += borrow.Quantity;
      await equipment.save();
    }

    // 3. อัปเดตฟิลด์ ReturnDate ใน borrow (ใช้วันที่คืนจริง)
    const returnDate = new Date();
    borrow.ReturnDate = returnDate;
    borrow.Returned = true; // กำหนดสถานะว่า คืนแล้ว
    await borrow.save();

    // 4. บันทึกข้อมูลการคืนในคอลเลกชัน Returns
    const lastReturn = await Return.findOne().sort({ ReturnID: -1 });

    const returnRecord = new Return({
      ReturnID: lastReturn ? lastReturn.ReturnID + 1 : 1,
      username: borrow.username,
      name: borrow.name,
      EquipmentID: borrow.EquipmentID,
      Quantity: borrow.Quantity,
      ReturnDate: returnDate,
      Created_At: new Date()
    });

    await returnRecord.save();

    res.status(201).json({ message: 'คืนอุปกรณ์สำเร็จ', return: returnRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการคืนอุปกรณ์', error: err.message });
  }
});

app.get('/returns', authenticateToken, async (req, res) => {
  try {
    const returns = await Return.find({ username: req.user.username });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
