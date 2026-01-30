const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

const MAX_MESSAGES_PER_RAG = 20;

const getUsage = async (req, res, next) => {
  try {
    const { rag_type: ragType } = req.query;
    if (!ragType) {
      throw new ApiError("rag_type is required", 400);
    }

    await pool.query(
      `
      INSERT INTO usage_limits (user_id, rag_type, message_count)
      VALUES ($1, $2, 0)
      ON CONFLICT (user_id, rag_type) DO NOTHING
      `,
      [req.user.id, ragType]
    );

    await pool.query(
      `
      UPDATE usage_limits
      SET message_count = 0,
          updated_at = NOW()
      WHERE user_id = $1
        AND rag_type = $2
        AND updated_at < NOW() - INTERVAL '24 hours'
      `,
      [req.user.id, ragType]
    );

    const result = await pool.query(
      "SELECT message_count, updated_at FROM usage_limits WHERE user_id = $1 AND rag_type = $2",
      [req.user.id, ragType]
    );
    const count = result.rows[0]?.message_count || 0;
    const updatedAt = result.rows[0]?.updated_at || null;
    const resetAt =
      count >= MAX_MESSAGES_PER_RAG && updatedAt
        ? new Date(new Date(updatedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null;

    return res.json({
      rag_type: ragType,
      message_count: count,
      remaining: Math.max(0, MAX_MESSAGES_PER_RAG - count),
      limit: MAX_MESSAGES_PER_RAG,
      reset_at: resetAt,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getUsage };
