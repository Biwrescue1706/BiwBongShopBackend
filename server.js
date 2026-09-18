require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Environment
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is not defined in .env");
  process.exit(1);
}

// CORS
const allowedOrigins = [
  // Local
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",

  // Existing systems
  "https://biwbongshop.onrender.com",
  "https://biwbongexpenses.onrender.com",
  "https://biwbongshopbackend.onrender.com",

  // Cashflow
  "https://hub-cashflow.smartdorm-biwboong.shop",
  "https://cashflow-page.smartdorm-biwboong.shop"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // อนุญาต request ที่ไม่มี Origin เช่น Postman / Server-to-Server
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB
mongoose
  .connect(MONGO_URI, {
    dbName: "BiwBongShop"
  })
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Borrow System Routes
const authRoutes = require("./routes/borrw/auth.routes");
const usersRoutes = require("./routes/borrw/users.routes");
const equipmentsRoutes = require("./routes/borrw/equipments.routes");
const borrowsRoutes = require("./routes/borrw/borrows.routes");
const returnsRoutes = require("./routes/borrw/returns.routes");

// Expense System Routes
const electricityRoutes = require("./routes/expenses/electricity/electricity.routes");
const waterRoutes = require("./routes/expenses/water/water.routes");
const combineRoutes = require("./routes/expenses/combined/combined.routes");

// Cashflow Routes
const authRoute = require("./routes/expen/auth.route");
const typeRoute = require("./routes/expen/type.route");
const categoryRoute = require("./routes/expen/category.route");
const transactionRoute = require("./routes/expen/transaction.route");
const dashboardRoute = require("./routes/expen/dashboard.route");
const userRoute = require("./routes/expen/user.route");
const accountTypeRoute = require("./routes/expen/accountType.route");
const accountsRoute = require("./routes/expen/accounts.route");

// Borrow API
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/equipments", equipmentsRoutes);
app.use("/borrows", borrowsRoutes);
app.use("/returns", returnsRoutes);

// Expense API
app.use("/expenses/electricity", electricityRoutes);
app.use("/expenses/water", waterRoutes);
app.use("/expenses/combined", combineRoutes);

// Cashflow API
app.use("/cashflow/dashboard", dashboardRoute);
app.use("/cashflow/auth", authRoute);
app.use("/cashflow/users", userRoute);
app.use("/cashflow/types", typeRoute);
app.use("/cashflow/categories", categoryRoute);
app.use("/cashflow/transactions", transactionRoute);
app.use("/cashflow/account-types", accountTypeRoute);
app.use("/cashflow/accounts", accountsRoute);

// Default Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 BiwBong Backend API is running"
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "ไม่พบ API หน้านี้",
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);

  // CORS Error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS ไม่อนุญาตให้เข้าถึง API",
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
    error: err.message
  });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});