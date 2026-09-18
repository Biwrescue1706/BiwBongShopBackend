// expense-backend/src/controllers/type.controller.js
const typeService = require("../services/type.service");

// GET
exports.getTypes = async (req, res) => {
    try {
        const data = await typeService.getAll();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// CREATE
exports.createType = async (req, res) => {
    try {
        const result = await typeService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// UPDATE
exports.updateType = async (req, res) => {
    try {
        const result = await typeService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE
exports.deleteType = async (req, res) => {
    try {
        const result = await typeService.remove(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};