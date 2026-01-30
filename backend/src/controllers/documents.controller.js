const pool = require("../config/db");
const queue = require("../jobs/queue");
const ApiError = require("../utils/ApiError");

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
