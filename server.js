require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// ตรวจสอบ .env
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

// กำหนด Origin ที่อนุญาต
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:3000',    
'https://biwbongshop.onrender.com', 'https://biwbongshopbackend.onrender.com'
];

// สร้าง app
const app = express();

// ใช้ middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// เชื่อม MongoDB
mongoose.connect(MONGO_URI, {
  dbName: 'BiwBongShop',
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB connected");
}).catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

// นำเข้า routes
const authRoutes = require('./routes/borrw/auth.routes');
const usersRoutes = require('./routes/borrw/users.routes');
const equipmentsRoutes = require('./routes/borrw/equipments.routes');
const borrowsRoutes = require('./routes/borrw/borrows.routes');
const returnsRoutes = require('./routes/borrw/returns.routes');
const electricityRoutes = require('./routes/expenses/electricity/electricity.routes');
const waterRoutes = require('./routes/expenses/water/water.routes');
const combineRoutes = require('./routes/expenses/combined/combined.routes');

// ใช้งาน routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/equipments', equipmentsRoutes);
app.use('/borrows', borrowsRoutes);
app.use('/returns', returnsRoutes);

app.use('/expenses/electricity', electricityRoutes );
app.use('/expenses/water', waterRoutes);
app.use('/expenses/combined',combineRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('🚀 เซิร์ฟเวอร์ backend กำลังทำงานอยู่ครับ...');
});

// 404 not found
app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบ API หน้านี้' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌", err.stack);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์', error: err.message });
});

// เริ่ม server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});