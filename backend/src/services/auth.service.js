const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const ApiError = require("../utils/ApiError");
const { refreshTokenTtlDays } = require("../config/env");

const SALT_ROUNDS = 10;

const createUser = async ({ email, password }) => {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rows.length > 0) {
    throw new ApiError("Email already in use", 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
    [email, passwordHash]
  );

  return result.rows[0];
};

const validateUser = async ({ email, password }) => {
  const result = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user) {
    throw new ApiError("Invalid credentials", 401);
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new ApiError("Invalid credentials", 401);
  }

  return { id: user.id, email: user.email };
};

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError("JWT secret not configured", 500);
  }

  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const createRefreshToken = async (userId) => {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000
  );

  await pool.query(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    `,
    [userId, hash, expiresAt]
  );

  return token;
};

const rotateRefreshToken = async (refreshToken) => {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const res = await pool.query(
    `
    SELECT id, user_id, expires_at, revoked_at
    FROM refresh_tokens
    WHERE token_hash = $1
    `,
    [hash]
  );
  const tokenRow = res.rows[0];
  if (!tokenRow || tokenRow.revoked_at) {
    throw new ApiError("Invalid refresh token", 401);
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    throw new ApiError("Refresh token expired", 401);
  }

  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1",
    [tokenRow.id]
  );

  const userRes = await pool.query(
    "SELECT id, email FROM users WHERE id = $1",
    [tokenRow.user_id]
  );
  const user = userRes.rows[0];
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const accessToken = signToken(user);
  const newRefreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken, user };
};

const revokeRefreshToken = async (refreshToken) => {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
    [hash]
  );
};

module.exports = {
  createUser,
  validateUser,
  signToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
