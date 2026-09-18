const router = require("express").Router();
const typeController = require("../controllers/type.controller");

router.get("/", typeController.getTypes);
router.post("/", typeController.createType);
router.put("/:id", typeController.updateType);
router.delete("/:id", typeController.deleteType);

module.exports = router;