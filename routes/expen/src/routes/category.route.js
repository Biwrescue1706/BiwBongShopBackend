const router = require("express").Router();

const controller = require("../controllers/category.controller");

router.get("/", controller.getCategories);
router.get("/:id", controller.getCategory);
router.post("/", controller.createCategory);
router.put("/:id", controller.updateCategory);
router.delete("/:id", controller.deleteCategory);

module.exports = router;