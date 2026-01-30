const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { frontendUrl } = require("./config/env");
const routes = require("./routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const requestId = require("./middlewares/requestId");
const rateLimit = require("./middlewares/rateLimit");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);
app.use(requestId);
app.use(rateLimit);
app.use(express.json({ limit: "1mb" }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :req[x-request-id]")
);

app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
