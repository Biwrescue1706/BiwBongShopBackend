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

// Register
app.post('/register', async (req, res) => {
  try {
    const { username, name, password } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ message: "กรุณากรอก username, name และ password ให้ครบ" });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username นี้ถูกใช้งานแล้ว" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      UserId: await getNextUserId(),
      username,
      name,
      password: hashedPassword,
      Update_At: null
    });
    await newUser.save();
    res.json({
      message: "สมัครสมาชิกสำเร็จ",
      user: {
        UserId: newUser.UserId,
        username: newUser.username,
        name: newUser.name,
        Created_At: newUser.Created_At,
        Update_At: newUser.Update_At
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด ในการ สมัครสมาชิก", error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "กรุณากรอก username และ password" });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });

    const datapayload = {
      username: user.username,
      name: user.name,
      UserId: user.UserId
    }

    const token = jwt.sign(datapayload, JWT_SECRET, { expiresIn: "5m" });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000 // 5 นาที
    });

    res.json({
      "message": "เข้าสู่ระบบสำเร็จแล้ว",
      "token": token,
      "ข้อมูล": {
        "ไอดี": user.UserId,
        "ชื่อผู้ใช้": user.username,
        "ชื่อ": user.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: err.message
    });
  }
});

// Profile
app.get('/profile', authenticateToken, (req, res) => {
  res.json({
    message: "โทเค็นถูกต้อง",
    user: req.user,
    signature: "ลายเซ็นได้รับการตรวจสอบแล้ว"
  });
});

// Logout
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'ออกจากระบบสำเร็จแล้ว' });
});

// GET all users
app.get('/Users', async (req, res) => {
  try {
    const users = await User.find().select('-password -_id -__v');
    res.json({ message: "สมาชิกทั้งหมด", users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET user by ID
app.get('/Users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await User.findOne({ UserId: id }).select('-password -_id -__v');
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    res.json({ message: `สมาชิก คนที่ ${id}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user
app.put('/Users/:id', authenticateToken, async (req, res) => {
  const { Name, Password } = req.body;
  try {
    const id = parseInt(req.params.id, 10);
    const user = await User.findOne({ UserId: id });
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    if (Name) user.name = Name;
    if (Password) user.password = await bcrypt.hash(Password, 10);
    user.Update_At = new Date();

    await user.save();

    res.json({
      message: "อัปเดตข้อมูลผู้ใช้สำเร็จ", user: {
        UserId: user.UserId,
        username: user.username,
        name: user.name,
        Created_At: user.Created_At,
        Update_At: user.Update_At
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// เพิ่มอุปกรณ์ (ต้องล็อกอิน)
app.post('/equipments', authenticateToken, async (req, res) => {
  console.log('Request body:', req.body); // เพิ่ม log เพื่อตรวจสอบ
  try {
    const { EName, Total } = req.body;
    if (!EName || typeof Total !== 'number') {
      return res.status(400).json({ message: 'กรุณาระบุชื่ออุปกรณ์และจำนวนทั้งหมด' });
    }

    const last = await Equipment.findOne().sort({ EID: -1 });
    const newEID = last ? last.EID + 1 : 1;

    const equipment = new Equipment({
      EID: newEID,
      EName,
      Total,
      Available: Total,
      Created_ById: req.user.UserId,
      Created_Byusername: req.user.username,
      Created_At: new Date(),
      Update_At: null,
      Update_ById: null,
      Update_Byusername: null,
    });

    await equipment.save();
    res.status(201).json(equipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์", error: err.message });
  }
});

app.get('/equipments', async (req, res) => {
  try {
    const equipments = await Equipment.find()
      .populate('Created_ById', 'username name')
      .populate('Update_ById', 'username name');
    res.json(equipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/equipments/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findOne({ EID: parseInt(req.params.id, 10) });
    if (!equipment) return res.status(404).json({ message: "ไม่พบอุปกรณ์" });
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// อัปเดตอุปกรณ์ พร้อมเก็บข้อมูลผู้แก้ไข
app.put('/equipments/:id', authenticateToken, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id, 10);
    const { EName, Total } = req.body;

    const equipment = await Equipment.findOne({ EID: equipmentId });
    if (!equipment) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์" });
    }

    if (EName) {
      equipment.EName = EName;
    }

    if (typeof Total === 'number') {
      // คำนวณจำนวนที่ถูกยืมออกไป (Total - Available)
      const borrowed = equipment.Total - equipment.Available;

      if (Total < borrowed) {
        return res.status(400).json({ message: "จำนวนรวม (Total) ต้องไม่น้อยกว่าจำนวนที่ยืมออกไป" });
      }

      equipment.Total = Total;
      equipment.Available = Total - borrowed;
    }

    // บันทึกข้อมูลผู้แก้ไขและเวลา
    equipment.Update_ById = req.user.UserId;
    equipment.Update_Byusername = req.user.username;
    equipment.Update_At = new Date();

    await equipment.save();

    res.json({
      message: "อัปเดตอุปกรณ์เรียบร้อย",
      equipment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการอัปเดตอุปกรณ์",
      error: err.message
    });
  }
});

// ลบอุปกรณ์
app.delete('/equipments/:id', authenticateToken, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id, 10);
    const equipment = await Equipment.findOneAndDelete({ EID: equipmentId });

    if (!equipment) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์ที่ต้องการลบ" });
    }

    res.json({ message: "ลบอุปกรณ์เรียบร้อย" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบอุปกรณ์", error: err.message });
  }
});

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


app.get('/borrows',authenticateToken, async (req, res) => {
  try {
    const borrows = await Borrow.find({ username: req.user.username });
    res.json(borrows);
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
