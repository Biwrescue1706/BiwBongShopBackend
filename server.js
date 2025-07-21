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

// import routes
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const equipmentsRoutes = require('./routes/equipments.routes');
const borrowsRoutes = require('./routes/borrows.routes');
const returnsRoutes = require('./routes/returns.routes');

const app = express();

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://127.0.0.1:5500',
      'https://biwrescue1706.github.io/BiwBong'
    ];
    // origin อาจเป็น undefined ถ้า request จากเครื่องมืออย่าง Postman ให้ผ่าน
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

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

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/equipments', equipmentsRoutes);
app.use('/borrows', borrowsRoutes);
app.use('/returns', returnsRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Backend server is running');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบ api หน้านี้' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
