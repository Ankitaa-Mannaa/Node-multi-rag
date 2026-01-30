const express = require("express");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const messagesController = require("../controllers/messages.controller");
const { listMessagesSchema } = require("../schemas/messages.schema");

const router = express.Router();

router.get("/messages", auth, validate(listMessagesSchema), messagesController.listMessages);

module.exports = router;
