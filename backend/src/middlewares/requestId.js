const crypto = require("crypto");

module.exports = (req, res, next) => {
  const id = crypto.randomUUID();
  req.id = id;
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-Id", id);
  next();
};
