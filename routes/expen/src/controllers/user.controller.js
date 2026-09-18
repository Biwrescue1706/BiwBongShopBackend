// expense-backend/src/controllers/user.controller.js
const userService = require("../services/user.service");

// GET ALL
exports.getUsers = async (req, res) => {
    try {
        const data = await userService.getAll();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET ONE
exports.getUser = async (req, res) => {
    try {
        const data = await userService.getById(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: "ไม่พบข้อมูล" });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// CREATE
exports.createUser = async (req, res) => {
    try {
        const result = await userService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// UPDATE
exports.updateUser = async (req, res) => {
    try {
        const result = await userService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE
exports.deleteUser = async (req, res) => {
    try {
        const result = await userService.remove(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};