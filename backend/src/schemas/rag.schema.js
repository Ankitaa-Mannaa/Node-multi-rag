const { z } = require("zod");

const ragQuerySchema = z.object({
  body: z.object({
    chat_id: z.string().uuid(),
    message: z.string().min(1).max(2000),
  }),
});

module.exports = {
  ragQuerySchema,
};
