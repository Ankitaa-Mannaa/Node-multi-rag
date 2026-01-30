const eventsService = require("../services/events.service");

const listEvents = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const events = await eventsService.listEvents({ limit, offset });
    return res.json({ events });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listEvents };
