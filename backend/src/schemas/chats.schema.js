const { z } = require("zod");

const createChatSchema = z.object({
  body: z.object({
    rag_type: z.enum(["support", "resume", "expense", "general"]),
    title: z.string().min(1).max(120).optional(),
  }),
});

const listChatsSchema = z.object({
  query: z.object({
    rag_type: z.enum(["support", "resume", "expense", "general"]).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
  }),
});

const deleteChatSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const updateChatSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(120),
  }),
});

const chatDocumentsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const setChatDocumentsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    document_ids: z.array(z.string().uuid()).default([]),
  }),
});

module.exports = {
  createChatSchema,
  listChatsSchema,
  deleteChatSchema,
  updateChatSchema,
  chatDocumentsSchema,
  setChatDocumentsSchema,
};
