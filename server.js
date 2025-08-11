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

if (!MONGO_URI) { console.error('❌ MONGO_URI missing'); process.exit(1); }
if (!JWT_SECRET) { console.error('❌ JWT_SECRET missing'); process.exit(1); }

// ===== Allowed Origins =====
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:3000',
  'https://biwbongshop.onrender.com',
  'https://biwbongbackend.onrender.com',
];

// ===== Core config =====
app.set('trust proxy', 1);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// ===== MongoDB =====
mongoose.connect(MONGO_URI, {
  dbName: 'BiwBongShop',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err?.message || err);
  process.exit(1);
});

// ===== Helper: safeMount (ประกาศก่อนใช้) =====
function safeMount(path, modPath) {
  try {
    const router = require(modPath);
    if (typeof router !== 'function') {
      throw new Error(`Module ${modPath} did not export a router/function`);
    }
    app.use(path, router);
    console.log(`✅ Mounted ${modPath} at ${path}`);
  } catch (e) {
    console.error(`❌ Mount failed for ${modPath}:`, e);
    process.exit(1);
  }
}

// ===== Routes (ใช้ safeMount ชุดเดียวพอ) =====
safeMount('/auth', './routes/auth.routes');
safeMount('/users', './routes/users.routes');
safeMount('/equipments', './routes/equipments.routes');
safeMount('/borrows', './routes/borrows.routes');
safeMount('/returns', './routes/returns.routes');

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