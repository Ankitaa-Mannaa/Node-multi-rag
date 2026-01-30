const { z } = require("zod");

const listEventsSchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
  }),
});

module.exports = { listEventsSchema };
