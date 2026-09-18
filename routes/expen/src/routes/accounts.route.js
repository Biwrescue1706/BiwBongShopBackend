const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const accountsController = require("../controllers/accounts.controller");

router.use(auth);

router.get("/", accountsController.getAccounts);
router.post("/", accountsController.createAccount);
router.patch("/:id", accountsController.updateAccount);
router.delete("/:id", accountsController.deleteAccount);

module.exports = router;