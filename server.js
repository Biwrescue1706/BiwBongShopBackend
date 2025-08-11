// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// ===== .env =====
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'production';

if (!MONGO_URI) {
  console.error('❌ MONGO_URI missing');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET missing');
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

// ===== Core config =====
// อยู่หลัง proxy (Render) เพื่อให้ secure cookie ทำงาน
app.set('trust proxy', 1);

// CORS + preflight
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // เช่น Postman/health checks
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
    console.error('❌ MongoDB connection error:', err?.message || err);
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
app.get('/healthz', (req, res) => res.json({ ok: true, env: NODE_ENV }));
app.get('/', (req, res) => res.send('🚀 Backend server is running...'));

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบ API หน้านี้' });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error('❌', err.stack || err);
  res.status(500).json({
    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
    error: err.message || String(err),
  });
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});