const crypto = require("crypto");

const buildWebhookBody = (event) =>
  JSON.stringify({
    id: event.id,
    type: event.type,
    payload: event.payload,
    created_at: event.created_at,
  });

const signWebhookBody = (body, secret) =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");

module.exports = { buildWebhookBody, signWebhookBody };
