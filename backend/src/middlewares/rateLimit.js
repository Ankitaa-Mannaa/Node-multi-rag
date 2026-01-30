const rateLimit = require("express-rate-limit");
const { rateLimitMax, rateLimitWindowMs } = require("../config/env");

module.exports = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});
