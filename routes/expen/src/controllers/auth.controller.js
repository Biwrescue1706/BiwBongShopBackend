// expense-backend/src/controllers/auth.controllers.js
const authService = require("../services/auth.service");

// Register
exports.register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const result = await authService.login(req.body);

        res.cookie("token", result.token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "เข้าสู่ระบบสำเร็จ",
            user: result.user
        });

    } catch (err) {

        return res.status(401).json({
            success: false,
            message: err.message
        });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const result = await authService.forgotPassword(req.body.email);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await authService.verifyOtp(email, otp);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.resetPassword(email, password);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Get Profile
exports.profile = async (req, res) => {
    res.json({ success: true, user: req.user });
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const result = await authService.updateProfile(req.user, req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const result = await authService.changePassword(req.user, req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Logout
exports.logout = (req, res) => {
    res.clearCookie("token");
    return res.json({ success: true, message: "ออกจากระบบสำเร็จ" });
};