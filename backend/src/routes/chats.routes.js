const express = require("express");
const auth = require("../middlewares/auth");
const chatsController = require("../controllers/chats.controller");
const validate = require("../middlewares/validate");
const {
  createChatSchema,
  listChatsSchema,
  deleteChatSchema,
} = require("../schemas/chats.schema");

const router = express.Router();

router.post("/chats", auth, validate(createChatSchema), chatsController.createChat);
router.get("/chats", auth, validate(listChatsSchema), chatsController.listChats);
router.delete("/chats/:id", auth, validate(deleteChatSchema), chatsController.deleteChat);

module.exports = router;
