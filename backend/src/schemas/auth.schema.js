const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    "Password must include uppercase, lowercase, and number"
  );

const emailSchema = z
  .string()
  .min(6, "Email must be at least 6 characters")
  .email("Email must be a valid email address");

const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(20),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
};
