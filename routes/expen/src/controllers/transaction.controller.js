const transactionService = require("../services/transaction.service");

// GET
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await transactionService.getAll(userId);

        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// CREATE
exports.createTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await transactionService.create(
            userId,
            req.body
        );

        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// UPDATE
exports.updateTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await transactionService.update(
            userId,
            req.params.id,
            req.body
        );

        res.json(result);
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// DELETE
exports.deleteTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await transactionService.remove(
            userId,
            req.params.id
        );

        res.json(result);
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};