const express = require("express");
const auth = require("../middlewares/auth");
const chatsController = require("../controllers/chats.controller");
const validate = require("../middlewares/validate");
const {
  createChatSchema,
  listChatsSchema,
  deleteChatSchema,
  updateChatSchema,
  chatDocumentsSchema,
  setChatDocumentsSchema,
} = require("../schemas/chats.schema");

const router = express.Router();

router.post("/chats", auth, validate(createChatSchema), chatsController.createChat);
router.get("/chats", auth, validate(listChatsSchema), chatsController.listChats);
router.delete("/chats/:id", auth, validate(deleteChatSchema), chatsController.deleteChat);
router.patch("/chats/:id", auth, validate(updateChatSchema), chatsController.updateChat);
router.get(
  "/chats/:id/documents",
  auth,
  validate(chatDocumentsSchema),
  chatsController.listChatDocuments
);
router.put(
  "/chats/:id/documents",
  auth,
  validate(setChatDocumentsSchema),
  chatsController.setChatDocuments
);

module.exports = router;
