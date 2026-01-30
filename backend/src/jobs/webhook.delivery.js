const pool = require("../config/db");
const queue = require("./queue");
const { buildWebhookBody, signWebhookBody } = require("../utils/webhook");

const nextDelayMinutes = (attempts) => {
  if (attempts <= 1) return 1;
  if (attempts === 2) return 5;
  return 15;
};

const deliver = async ({ deliveryId }) => {
  const res = await pool.query(
    `
    SELECT d.id, d.status, d.attempts, d.max_attempts, d.next_attempt_at,
           s.url, s.secret,
           e.id AS event_id, e.type, e.payload, e.created_at
    FROM webhook_deliveries d
    JOIN webhook_subscriptions s ON s.id = d.subscription_id
    JOIN events e ON e.id = d.event_id
    WHERE d.id = $1
    `,
    [deliveryId]
  );

  const row = res.rows[0];
  if (!row) return;
  if (row.status === "success" || row.status === "failed") return;
  if (row.next_attempt_at && new Date(row.next_attempt_at) > new Date()) return;

  const currentAttempts = row.attempts || 0;
  await pool.query(
    "UPDATE webhook_deliveries SET status = 'running', attempts = $2, updated_at = NOW() WHERE id = $1",
    [deliveryId, currentAttempts + 1]
  );

  const body = buildWebhookBody({
    id: row.event_id,
    type: row.type,
    payload: row.payload,
    created_at: row.created_at,
  });
  const signature = signWebhookBody(body, row.secret);

  try {
    const resp = await fetch(row.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body,
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    await pool.query(
      `
      UPDATE webhook_deliveries
      SET status = 'success',
          delivered_at = NOW(),
          last_error = NULL,
          updated_at = NOW()
      WHERE id = $1
      `,
      [deliveryId]
    );
  } catch (err) {
    const attempts = (row.attempts || 0) + 1;
    const reschedule = attempts < row.max_attempts;

    if (reschedule) {
      const delay = nextDelayMinutes(attempts);
      const nextRun = new Date(Date.now() + delay * 60 * 1000);
      await pool.query(
        `
        UPDATE webhook_deliveries
        SET status = 'pending',
            attempts = $2,
            last_error = $3,
            next_attempt_at = $4,
            updated_at = NOW()
        WHERE id = $1
        `,
        [deliveryId, attempts, err.message, nextRun]
      );
      await queue.enqueue("deliver-webhook", { deliveryId }, nextRun);
      return;
    }

    await pool.query(
      `
      UPDATE webhook_deliveries
      SET status = 'failed',
          attempts = $2,
          last_error = $3,
          updated_at = NOW()
      WHERE id = $1
      `,
      [deliveryId, attempts, err.message]
    );
  }
};

module.exports = { deliver };
