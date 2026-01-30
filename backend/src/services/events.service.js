const pool = require("../config/db");
const queue = require("../jobs/queue");

const publishEvent = async ({ type, payload, userId = null }) => {
  const result = await pool.query(
    "INSERT INTO events (type, payload, user_id) VALUES ($1, $2, $3) RETURNING id, type, payload, user_id, created_at",
    [type, payload, userId]
  );
  const event = result.rows[0];
  await queue.enqueue("dispatch-webhooks", { eventId: event.id });
  return event;
};

const listEvents = async ({ limit = 50, offset = 0 }) => {
  const res = await pool.query(
    "SELECT id, type, payload, user_id, created_at FROM events ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return res.rows;
};

module.exports = { publishEvent, listEvents };
