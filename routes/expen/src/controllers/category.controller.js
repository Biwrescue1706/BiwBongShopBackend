// expense-backend/src/controllers/category.controller.js
const categoryService = require("../services/category.service");

// GET ALL
exports.getCategories = async (req, res) => {
    try {
        const data = await categoryService.getAll(req.query.type);
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET ONE
exports.getCategory = async (req, res) => {
    try {
        const data = await categoryService.getById(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: "ไม่พบข้อมูล" });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// CREATE
exports.createCategory = async (req, res) => {
    try {
        const result = await categoryService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
};

// UPDATE
exports.updateCategory = async (req, res) => {
    try {
        const result = await categoryService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE
exports.deleteCategory = async (req, res) => {
    try {
        const result = await categoryService.remove(req.params.id);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
};