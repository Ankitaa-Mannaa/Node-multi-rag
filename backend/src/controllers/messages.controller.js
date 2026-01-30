const pool = require("../config/db");

const listMessages = async (req, res, next) => {
  try {
    const { chat_id: chatId, limit, offset } = req.query;
    const lim = Number(limit) || 50;
    const off = Number(offset) || 0;

    const result = await pool.query(
      `
      SELECT m.id, m.chat_id, m.role, m.content, m.created_at
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.chat_id = $1 AND c.user_id = $2
      ORDER BY m.created_at ASC, m.role DESC, m.id ASC
      LIMIT $3 OFFSET $4
      `,
      [chatId, req.user.id, lim, off]
    );

    return res.json({ messages: result.rows });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listMessages };
