const router = require("express").Router();

const accountTypeController = require("../controllers/accountType.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.get(
    "/",
    authMiddleware,
    accountTypeController.getAccountTypes
);

router.post(
    "/",
   authMiddleware, accountTypeController.createAccountType
);

router.patch(
    "/:id",
   authMiddleware, accountTypeController.updateAccountType
);

router.delete(
    "/:id",
    authMiddleware,
    accountTypeController.deleteAccountType
);

module.exports = router;