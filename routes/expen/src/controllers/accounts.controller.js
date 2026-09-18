const accountsService = require("../services/accounts.service");

exports.getAccounts = async (req, res) => {
    try {
        const userId = req.user.id;


        const data = await accountsService.getAll(userId);

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

exports.createAccount = async (req, res) => {
    try {
        const userId = req.user.id;


        const result = await accountsService.create(
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

exports.updateAccount = async (req, res) => {
    try {
        const userId = req.user.id;


        const result = await accountsService.update(
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

exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;


        const result = await accountsService.remove(
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
