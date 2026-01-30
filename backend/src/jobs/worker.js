require("../config/env");
const pool = require("../config/db");
const handlers = require("./handlers");

const POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS) || 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchNextJob = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `
      SELECT *
      FROM jobs
      WHERE status = 'pending'
        AND run_at <= NOW()
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
      `
    );

    if (res.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const job = res.rows[0];
    const updated = await client.query(
      `
      UPDATE jobs
      SET status = 'running',
          attempts = attempts + 1,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [job.id]
    );

    await client.query("COMMIT");
    return updated.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const markDone = async (jobId) => {
  await pool.query(
    "UPDATE jobs SET status = 'done', updated_at = NOW() WHERE id = $1",
    [jobId]
  );
};

const markFailed = async (jobId, error, reschedule) => {
  if (reschedule) {
    await pool.query(
      `
      UPDATE jobs
      SET status = 'pending',
          last_error = $2,
          updated_at = NOW(),
          run_at = NOW() + INTERVAL '1 minute'
      WHERE id = $1
      `,
      [jobId, error]
    );
    return;
  }

  await pool.query(
    `
    UPDATE jobs
    SET status = 'failed',
        last_error = $2,
        updated_at = NOW()
    WHERE id = $1
    `,
    [jobId, error]
  );
};

const run = async () => {
  for (;;) {
    try {
      const job = await fetchNextJob();
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const handler = handlers[job.type];
      if (!handler) {
        await markFailed(job.id, "No handler for job type", false);
        continue;
      }

      try {
        await handler(job.payload);
        await markDone(job.id);
      } catch (err) {
        const reschedule = job.attempts < job.max_attempts;
        await markFailed(job.id, err.message || "Job failed", reschedule);
      }
    } catch (err) {
      console.error("Worker error", err);
      await sleep(POLL_INTERVAL_MS);
    }
  }
};

run();
