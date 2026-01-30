const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

module.exports = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return next(new ApiError("Unauthorized", 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    return next(new ApiError("Invalid token", 401));
  }
};
