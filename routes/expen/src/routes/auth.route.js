const router = require("express").Router();
const controller = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post("/forgot-password", controller.forgotPassword);
router.post("/verify-otp", controller.verifyOtp);
router.post("/reset-password", controller.resetPassword);
router.get("/profile", authMiddleware, controller.profile);
router.put("/profile",authMiddleware,controller.updateProfile);
router.post("/change-password",authMiddleware,controller.changePassword);

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/logout", controller.logout);

module.exports = router;