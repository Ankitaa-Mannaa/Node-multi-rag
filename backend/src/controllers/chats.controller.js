const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

const createChat = async (req, res, next) => {
  try {
    const { rag_type: ragType, title } = req.body;
    if (!ragType) {
      throw new ApiError("rag_type is required", 400);
    }

    const result = await pool.query(
      "INSERT INTO chats (user_id, rag_type, title) VALUES ($1, $2, $3) RETURNING id, user_id, rag_type, title, created_at",
      [req.user.id, ragType, title || null]
    );

    return res.status(201).json({ chat: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const listChats = async (req, res, next) => {
  try {
    const { rag_type: ragType, limit, offset } = req.query;
    const params = [req.user.id];
    let query =
      "SELECT id, rag_type, title, created_at FROM chats WHERE user_id = $1";

    if (ragType) {
      params.push(ragType);
      query += ` AND rag_type = $${params.length}`;
    }

    const lim = Number(limit) || 50;
    const off = Number(offset) || 0;
    params.push(lim);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    params.push(off);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    return res.json({ chats: result.rows });
  } catch (err) {
    return next(err);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Chat not found" });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createChat,
  listChats,
  deleteChat,
};
