const { z } = require("zod");

const listMessagesSchema = z.object({
  query: z.object({
    chat_id: z.string().uuid(),
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
  }),
});

module.exports = { listMessagesSchema };
