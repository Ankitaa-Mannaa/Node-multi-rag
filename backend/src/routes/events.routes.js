const express = require("express");
const auth = require("../middlewares/auth");
const eventsController = require("../controllers/events.controller");
const validate = require("../middlewares/validate");
const { listEventsSchema } = require("../schemas/events.schema");

const router = express.Router();

router.get("/events", auth, validate(listEventsSchema), eventsController.listEvents);

module.exports = router;
