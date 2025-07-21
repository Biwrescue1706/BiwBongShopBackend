require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// ตรวจสอบ .env
const PORT = process.env.PORT || 5000;
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
  'https://biwbong-frontend.onrender.com',
  'https://biwrescue1706.github.io',
  'https://biwbongbackend.onrender.com'
];

// สร้าง app
const app = express();

// ใช้ middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser tools (postman, curl)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
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
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const equipmentsRoutes = require('./routes/equipments.routes');
const borrowsRoutes = require('./routes/borrows.routes');
const returnsRoutes = require('./routes/returns.routes');

// ใช้งาน routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/equipments', equipmentsRoutes);
app.use('/borrows', borrowsRoutes);
app.use('/returns', returnsRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('🚀 Backend server is running...');
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
