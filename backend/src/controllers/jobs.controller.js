const pool = require("../config/db");

const listJobs = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT id, type, status, attempts, last_error, created_at, updated_at
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 20
      `
    );
    return res.json({ jobs: result.rows });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listJobs };
