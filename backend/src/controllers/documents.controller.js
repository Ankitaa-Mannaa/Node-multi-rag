const pool = require("../config/db");
const queue = require("../jobs/queue");
const ApiError = require("../utils/ApiError");
const { maxMessagesPerRag } = require("../config/env");

const JOB_BY_RAG = {
  support: "process-support-doc",
  resume: "process-resume",
  expense: "process-expense-csv",
};

const uploadDocument = async (req, res, next) => {
  try {
    const ragType = (req.body.rag_type || "").toLowerCase();
    const jobType = JOB_BY_RAG[ragType];

    if (!jobType) {
      throw new ApiError("Invalid rag_type for upload", 400);
    }

    if (!req.file) {
      throw new ApiError("File is required", 400);
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

    const usageRes = await pool.query(
      "SELECT message_count FROM usage_limits WHERE user_id = $1 AND rag_type = $2",
      [req.user.id, ragType]
    );
    const count = usageRes.rows[0]?.message_count || 0;
    if (count >= maxMessagesPerRag) {
      throw new ApiError(
        "Message limit reached. Uploads are disabled until the limit resets.",
        403
      );
    }

    const result = await pool.query(
      `
      INSERT INTO documents (user_id, rag_type, file_name, file_path, file_type, file_size, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, rag_type, file_name, file_path, file_type, file_size, status, created_at
      `,
      [
        req.user.id,
        ragType,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        "uploaded",
      ]
    );

    const document = result.rows[0];

    await queue.enqueue(jobType, { documentId: document.id });

    return res.status(201).json({ document });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  uploadDocument,
};
