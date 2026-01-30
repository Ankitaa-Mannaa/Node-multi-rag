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

const updateChat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const result = await pool.query(
      "UPDATE chats SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING id, rag_type, title, created_at",
      [title || null, id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Chat not found" });
    }

    return res.json({ chat: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const listChatDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const chatRes = await pool.query(
      "SELECT id, user_id FROM chats WHERE id = $1",
      [id]
    );
    const chat = chatRes.rows[0];
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (chat.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const docsRes = await pool.query(
      "SELECT document_id FROM chat_documents WHERE chat_id = $1",
      [id]
    );
    return res.json({ document_ids: docsRes.rows.map((r) => r.document_id) });
  } catch (err) {
    return next(err);
  }
};

const setChatDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { document_ids: documentIds } = req.body;
    const chatRes = await pool.query(
      "SELECT id, user_id, rag_type FROM chats WHERE id = $1",
      [id]
    );
    const chat = chatRes.rows[0];
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (chat.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const ids = Array.isArray(documentIds) ? documentIds : [];
    if (ids.length > 0) {
      const docRes = await pool.query(
        `
        SELECT id
        FROM documents
        WHERE user_id = $1 AND rag_type = $2 AND id = ANY($3::uuid[])
        `,
        [req.user.id, chat.rag_type, ids]
      );
      if (docRes.rows.length !== ids.length) {
        return res.status(400).json({ message: "Invalid document selection" });
      }
    }

    await pool.query("BEGIN");
    await pool.query("DELETE FROM chat_documents WHERE chat_id = $1", [id]);
    for (const docId of ids) {
      await pool.query(
        "INSERT INTO chat_documents (chat_id, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, docId]
      );
    }
    await pool.query("COMMIT");

    return res.json({ document_ids: ids });
  } catch (err) {
    try {
      await pool.query("ROLLBACK");
    } catch (_) {
      // ignore
    }
    return next(err);
  }
};

module.exports = {
  createChat,
  listChats,
  deleteChat,
  updateChat,
  listChatDocuments,
  setChatDocuments,
};
