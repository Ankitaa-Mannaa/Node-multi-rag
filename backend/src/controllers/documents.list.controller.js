const pool = require("../config/db");

const listDocuments = async (req, res, next) => {
  try {
    const { rag_type: ragType } = req.query;
    const params = [req.user.id];
    let query =
      "SELECT id, rag_type, file_name, status, error_message, created_at FROM documents WHERE user_id = $1";

    if (ragType) {
      params.push(ragType);
      query += ` AND rag_type = $${params.length}`;
    }

    query += " ORDER BY created_at DESC LIMIT 20";

    const result = await pool.query(query, params);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ documents: result.rows });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listDocuments };
