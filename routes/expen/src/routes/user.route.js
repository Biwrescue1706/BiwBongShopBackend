const router = require("express").Router();

const userController = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");

// GET ALL
router.get("/", auth, userController.getUsers);
router.get("/:id", auth, userController.getUser);
router.post("/", auth, userController.createUser);
router.patch("/:id", auth, userController.updateUser);
router.delete("/:id", auth, userController.deleteUser);

module.exports = router;