// server.js (หรือใช้ server.ts ถ้าใช้ TypeScript)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Equipment = require('./models/Equipment');
const Borrow = require('./models/Borrow');
const Return = require('./models/Return');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const SALT_ROUNDS = 10;

// Middleware
app.use(cors({
  origin: 'http://localhost:5500', // หรือ URL frontend
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ✅ JWT Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid Token' });
  }
}

// ✅ Register
app.post('/register', async (req, res) => {
  try {
    const { username, name, password } = req.body;
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const lastUser = await User.findOne().sort({ UserId: -1 });
    const newUser = await User.create({
      UserId: (lastUser?.UserId || 0) + 1,
      username,
      Name: name,
      password: hashed,
    });

    res.json({ message: 'User registered', user: newUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username: user.username, name: user.Name }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' }).json({ message: 'Login successful', name: user.Name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Logout
app.post('/logout', (req, res) => {
  res.clearCookie('token').json({ message: 'Logged out' });
});

// ✅ Create Equipment
app.post('/equipments', authMiddleware, async (req, res) => {
  try {
    const { name, total } = req.body;
    const newEquipment = await Equipment.create({ name, total, available: total });
    res.json(newEquipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get All Equipments
app.get('/equipments', async (req, res) => {
  try {
    const items = await Equipment.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get Equipment by ID
app.get('/equipments/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Not found' });
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update Equipment
app.put('/equipments/:id', authMiddleware, async (req, res) => {
  try {
    const { name, total } = req.body;
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Not found' });

    if (name) equipment.name = name;
    if (typeof total === 'number') {
      const used = equipment.total - equipment.available;
      if (total < used) return res.status(400).json({ message: 'Total น้อยเกินไป' });
      equipment.total = total;
      equipment.available = total - used;
    }

    await equipment.save();
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Delete Equipment
app.delete('/equipments/:id', authMiddleware, async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Borrow Equipment
app.post('/borrow', authMiddleware, async (req, res) => {
  try {
    const { EquipmentID, Quantity, ReturnDate } = req.body;
    const equipment = await Equipment.findById(EquipmentID);
    if (!equipment || equipment.available < Quantity) {
      return res.status(400).json({ message: 'Not enough available' });
    }

    equipment.available -= Quantity;
    await equipment.save();

    const borrow = await Borrow.create({
      Username: req.user.username,
      name: req.user.name,
      EquipmentID,
      Quantity,
      Date: new Date(),
      ReturnDate,
    });

    res.json(borrow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Return Equipment
app.post('/return/:borrowId', authMiddleware, async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.borrowId);
    if (!borrow || borrow.Returned) return res.status(400).json({ message: 'Already returned or invalid' });

    const equipment = await Equipment.findById(borrow.EquipmentID);
    if (equipment) {
      equipment.available += borrow.Quantity;
      await equipment.save();
    }

    await Return.create({
      BorrowID: borrow._id,
      Username: borrow.Username,
      name: borrow.name,
      EquipmentID: borrow.EquipmentID,
      Quantity: borrow.Quantity,
      ReturnDate: new Date(),
    });

    borrow.Returned = true;
    await borrow.save();

    res.json({ message: 'Returned successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get my borrows
app.get('/my-borrows', authMiddleware, async (req, res) => {
  try {
    const borrows = await Borrow.find({ Username: req.user.username });
    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get overdue borrows
app.get('/overdue', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const overdue = await Borrow.find({
      Username: req.user.username,
      ReturnDate: { $lt: now },
      Returned: { $ne: true }
    });
    res.json(overdue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ MongoDB Connect & Start
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log('✅ MongoDB Connected');
  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
})
.catch(err => console.error('❌ MongoDB Error:', err));
