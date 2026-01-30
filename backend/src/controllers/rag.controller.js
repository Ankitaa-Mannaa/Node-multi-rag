const ragService = require("../services/rag.service");
const ApiError = require("../utils/ApiError");

const query = async (req, res, next) => {
  try {
    const { chat_id: chatId, message } = req.body;
    if (!chatId || !message) {
      throw new ApiError("chat_id and message are required", 400);
    }

    const result = await ragService.runRagQuery({
      userId: req.user.id,
      chatId,
      message,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const stream = async (req, res, next) => {
  try {
    const { chat_id: chatId, message } = req.body;
    if (!chatId || !message) {
      throw new ApiError("chat_id and message are required", 400);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const result = await ragService.runRagQuery({
      userId: req.user.id,
      chatId,
      message,
    });

    res.write(`data: ${JSON.stringify(result)}\n\n`);
    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (err) {
    return next(err);
  }
};

module.exports = { query, stream };
