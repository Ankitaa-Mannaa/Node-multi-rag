const { z } = require("zod");

const uploadDocumentSchema = z.object({
  body: z.object({
    rag_type: z.enum(["support", "resume", "expense"]),
  }),
});

module.exports = { uploadDocumentSchema };
