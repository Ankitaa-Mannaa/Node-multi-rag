const pool = require("../config/db");
const queue = require("../jobs/queue");
const ApiError = require("../utils/ApiError");

const createSubscription = async (req, res, next) => {
  try {
    const { url, secret } = req.body;
    if (!url || !secret) {
      throw new ApiError("url and secret are required", 400);
    }

    const result = await pool.query(
      "INSERT INTO webhook_subscriptions (url, secret) VALUES ($1, $2) RETURNING id, url, is_active, created_at",
      [url, secret]
    );
    return res.status(201).json({ subscription: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const listSubscriptions = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, url, is_active, created_at FROM webhook_subscriptions ORDER BY created_at DESC"
    );
    return res.json({ subscriptions: result.rows });
  } catch (err) {
    return next(err);
  }
};

const toggleSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active: isActive } = req.body;
    if (typeof isActive !== "boolean") {
      throw new ApiError("is_active boolean is required", 400);
    }

    const result = await pool.query(
      "UPDATE webhook_subscriptions SET is_active = $1 WHERE id = $2 RETURNING id, url, is_active, created_at",
      [isActive, id]
    );
    return res.json({ subscription: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const deliverPending = async (req, res, next) => {
  try {
    const pending = await pool.query(
      `
      SELECT d.id
      FROM webhook_deliveries d
      WHERE d.status = 'pending'
      ORDER BY d.created_at ASC
      LIMIT 50
      `
    );

    for (const row of pending.rows) {
      await queue.enqueue("deliver-webhook", { deliveryId: row.id });
    }

    return res.json({ enqueued: pending.rows.length });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createSubscription,
  listSubscriptions,
  toggleSubscription,
  deliverPending,
};
