const { z } = require("zod");

const usageSchema = z.object({
  query: z.object({
    rag_type: z.enum(["support", "resume", "expense", "general"]),
  }),
});

module.exports = { usageSchema };
