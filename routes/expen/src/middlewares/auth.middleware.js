// expense-backend/src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) token = authHeader.split(" ")[1];
    }

    if (!token) return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Token หมดอายุ หรือไม่ถูกต้อง" });
    }
};