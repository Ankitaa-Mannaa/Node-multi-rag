const { z } = require("zod");

const createWebhookSchema = z.object({
  body: z.object({
    url: z.string().url(),
    secret: z.string().min(8),
  }),
});

const toggleWebhookSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    is_active: z.boolean(),
  }),
});

module.exports = { createWebhookSchema, toggleWebhookSchema };
