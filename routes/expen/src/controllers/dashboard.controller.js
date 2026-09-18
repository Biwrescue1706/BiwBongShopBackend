// expense-backend/src/controllers/dashboard.controller.js

const dashboardService = require("../services/dashboard.service");

exports.getDashboard = async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
        const data = await dashboardService.getDashboard(req.user.id);
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};