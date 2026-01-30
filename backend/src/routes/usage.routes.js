const express = require("express");
const auth = require("../middlewares/auth");
const usageController = require("../controllers/usage.controller");
const validate = require("../middlewares/validate");
const { usageSchema } = require("../schemas/usage.schema");

const router = express.Router();

router.get("/usage", auth, validate(usageSchema), usageController.getUsage);

module.exports = router;
