const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const documentsRoutes = require("./documents.routes");
const chatsRoutes = require("./chats.routes");
const ragRoutes = require("./rag.routes");
const usageRoutes = require("./usage.routes");
const eventsRoutes = require("./events.routes");
const webhooksRoutes = require("./webhooks.routes");
const messagesRoutes = require("./messages.routes");
const jobsRoutes = require("./jobs.routes");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(documentsRoutes);
router.use(chatsRoutes);
router.use(ragRoutes);
router.use(usageRoutes);
router.use(eventsRoutes);
router.use(webhooksRoutes);
router.use(messagesRoutes);
router.use(jobsRoutes);

module.exports = router;
