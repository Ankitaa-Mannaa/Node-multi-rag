const express = require("express");
const authController = require("../controllers/auth.controller");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
} = require("../schemas/auth.schema");

const router = express.Router();

router.post("/auth/register", validate(registerSchema), authController.register);
router.post("/auth/login", validate(loginSchema), authController.login);
router.post("/auth/refresh", validate(refreshSchema), authController.refresh);
router.post("/auth/logout", auth, authController.logout);

router.get("/auth/me", auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
