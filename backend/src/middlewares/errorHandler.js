module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const payload = {
    message: err.message || "Internal Server Error",
    request_id: req.id,
  };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};
