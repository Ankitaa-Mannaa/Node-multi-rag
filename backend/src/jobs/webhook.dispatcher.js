const pool = require("../config/db");
const queue = require("./queue");

const dispatch = async ({ eventId }) => {
  const eventRes = await pool.query(
    "SELECT id, type, payload, user_id FROM events WHERE id = $1",
    [eventId]
  );
  const event = eventRes.rows[0];
  if (!event) return;

  const subs = await pool.query(
    "SELECT id, url, secret, is_active FROM webhook_subscriptions WHERE is_active = true"
  );

  for (const sub of subs.rows) {
    const delivery = await pool.query(
      "INSERT INTO webhook_deliveries (subscription_id, event_id, status) VALUES ($1, $2, $3) RETURNING id",
      [sub.id, event.id, "pending"]
    );
    await queue.enqueue("deliver-webhook", { deliveryId: delivery.rows[0].id });
  }
};

module.exports = { dispatch };
