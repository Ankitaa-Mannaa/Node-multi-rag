const express = require("express");
const auth = require("../middlewares/auth");
const webhooksController = require("../controllers/webhooks.controller");
const validate = require("../middlewares/validate");
const {
  createWebhookSchema,
  toggleWebhookSchema,
} = require("../schemas/webhooks.schema");

const router = express.Router();

router.post(
  "/webhooks/subscriptions",
  auth,
  validate(createWebhookSchema),
  webhooksController.createSubscription
);
router.get("/webhooks/subscriptions", auth, webhooksController.listSubscriptions);
router.patch(
  "/webhooks/subscriptions/:id",
  auth,
  validate(toggleWebhookSchema),
  webhooksController.toggleSubscription
);

router.post("/webhooks/dispatch", auth, webhooksController.deliverPending);

module.exports = router;
