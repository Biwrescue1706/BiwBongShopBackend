const accountTypeService = require("../services/accountType.service");

// GET
exports.getAccountTypes = async (req, res) => {
    try {
        const userId = req.user.id;


        const data = await accountTypeService.getAll(userId);

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
exports.createAccountType = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await accountTypeService.create(
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
exports.updateAccountType = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await accountTypeService.update(
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
exports.deleteAccountType = async (req, res) => {
    try {
        const result = await accountTypeService.remove(req.params.id);

        res.json(result);
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};