const express = require("express");
const auth = require("../middlewares/auth");
const ragController = require("../controllers/rag.controller");
const validate = require("../middlewares/validate");
const { ragQuerySchema } = require("../schemas/rag.schema");

const router = express.Router();

router.post("/rag/query", auth, validate(ragQuerySchema), ragController.query);
router.post(
  "/rag/query/stream",
  auth,
  validate(ragQuerySchema),
  ragController.stream
);

module.exports = router;
