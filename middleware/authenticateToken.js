const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'ไม่มี token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'token ไม่ถูกต้องหรือหมดอายุ' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
