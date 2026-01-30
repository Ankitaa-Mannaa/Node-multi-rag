const fs = require("fs");
const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id, user_id, file_path FROM documents WHERE id = $1",
      [id]
    );
    const doc = result.rows[0];
    if (!doc) {
      throw new ApiError("Document not found", 404);
    }
    if (doc.user_id !== req.user.id) {
      throw new ApiError("Forbidden", 403);
    }

    await pool.query("DELETE FROM documents WHERE id = $1", [id]);

    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (err) {
        // best-effort file cleanup
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = { deleteDocument };
