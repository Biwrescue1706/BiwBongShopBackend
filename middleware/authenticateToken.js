const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function AuthenticateTokens(req, res, next) {
  // ดึง token จาก cookie หรือ Authorization header (Bearer token)
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // ถ้า token หมดอายุ หรือไม่ถูกต้อง
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded; // เก็บ payload ไว้ใช้ใน route ถัดไป
    next();
  });
}

module.exports = AuthenticateTokens;
