// Server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// ===== ตรวจ .env =====
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI is not defined in .env');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

// ===== Allowed Origins =====
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:3000',
  'https://biwbongshop.onrender.com',
  'https://biwbongbackend.onrender.com',
];

// ===== App =====
const app = express();

// สำคัญเมื่ออยู่หลัง proxy (เช่น Render) เพื่อให้คุกกี้ secure ทำงาน
app.set('trust proxy', 1);

// ===== CORS =====
const corsOptions = {
  origin(origin, callback) {
    // อนุญาตเครื่องมืออย่าง Postman/ไม่มี Origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // ให้ส่ง/รับคุกกี้ได้
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ใช้กับทุก request และรองรับ preflight
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ===== Middlewares =====
app.use(express.json());
app.use(cookieParser());

// ===== MongoDB =====
mongoose
  .connect(MONGO_URI, {
    dbName: 'BiwBongShop',
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message || err);
    process.exit(1);
  });

// ===== Routes =====
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const equipmentsRoutes = require('./routes/equipments.routes');
const borrowsRoutes = require('./routes/borrows.routes');
const returnsRoutes = require('./routes/returns.routes');

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/equipments', equipmentsRoutes);
app.use('/borrows', borrowsRoutes);
app.use('/returns', returnsRoutes);

// ===== Health & Root =====
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('🚀 Backend server is running...'));

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบ API หน้านี้' });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error('❌', err.stack || err);
  res
    .status(500)
    .json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์', error: err.message || String(err) });
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});