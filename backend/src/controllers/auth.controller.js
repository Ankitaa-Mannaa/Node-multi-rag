const authService = require("../services/auth.service");

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await authService.createUser({ email, password });
    const token = authService.signToken(user);
    const refreshToken = await authService.createRefreshToken(user.id);

    return res.status(201).json({ user, token, refresh_token: refreshToken });
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await authService.validateUser({ email, password });
    const token = authService.signToken(user);
    const refreshToken = await authService.createRefreshToken(user.id);

    return res.json({ user, token, refresh_token: refreshToken });
  } catch (err) {
    return next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body;
    const result = await authService.rotateRefreshToken(refreshToken);
    return res.json({
      user: result.user,
      token: result.accessToken,
      refresh_token: result.refreshToken,
    });
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body;
    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
