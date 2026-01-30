const pool = require("../config/db");

const enqueue = async (type, payload, runAt = null) => {
  const result = await pool.query(
    "INSERT INTO jobs (type, payload, run_at) VALUES ($1, $2, COALESCE($3, NOW())) RETURNING id, type, status, run_at",
    [type, payload, runAt]
  );
  return result.rows[0];
};

module.exports = { enqueue };
