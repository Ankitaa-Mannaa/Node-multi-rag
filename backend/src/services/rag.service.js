const pool = require("../config/db");
const ApiError = require("../utils/ApiError");
const aiService = require("./ai.service");
const vectorStore = require("./vectorStore.service");
const resumeScoring = require("./resumeScoring.service");
const financeService = require("./finance.service");

const { maxMessagesPerRag } = require("../config/env");

const getChatById = async (chatId, userId) => {
  const res = await pool.query(
    "SELECT id, user_id, rag_type, title, created_at FROM chats WHERE id = $1 AND user_id = $2",
    [chatId, userId]
  );
  return res.rows[0];
};

const getUsage = async (userId, ragType) => {
  const res = await pool.query(
    "SELECT message_count FROM usage_limits WHERE user_id = $1 AND rag_type = $2",
    [userId, ragType]
  );
  return res.rows[0] || null;
};

const ensureUsageRow = async (userId, ragType) => {
  await pool.query(
    `
    INSERT INTO usage_limits (user_id, rag_type, message_count)
    VALUES ($1, $2, 0)
    ON CONFLICT (user_id, rag_type) DO NOTHING
    `,
    [userId, ragType]
  );
};

const incrementUsage = async (client, userId, ragType) => {
  await client.query(
    `
    UPDATE usage_limits
    SET message_count = CASE
          WHEN updated_at < NOW() - INTERVAL '24 hours' THEN 1
          ELSE message_count + 1
        END,
        updated_at = NOW()
    WHERE user_id = $1 AND rag_type = $2
    `,
    [userId, ragType]
  );
};

const listRecentMessages = async (chatId, limit = 10) => {
  const res = await pool.query(
    `
    SELECT role, content, created_at
    FROM messages
    WHERE chat_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [chatId, limit]
  );
  return res.rows.reverse();
};

const listRelevantChunks = (userId, ragType, embedding, limit = 6) => {
  return vectorStore.listRelevantChunks(userId, ragType, embedding, limit);
};

const listDocumentsForRag = async (userId, ragType, limit = 10) => {
  const res = await pool.query(
    `
    SELECT id, file_name, status, created_at
    FROM documents
    WHERE user_id = $1 AND rag_type = $2 AND status = 'ready'
    ORDER BY created_at DESC
    LIMIT $3
    `,
    [userId, ragType, limit]
  );
  return res.rows;
};

const runRagQuery = async ({ userId, chatId, message }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const chatRes = await client.query(
      "SELECT id, rag_type FROM chats WHERE id = $1 AND user_id = $2",
      [chatId, userId]
    );
    const chat = chatRes.rows[0];
    if (!chat) {
      throw new ApiError("Chat not found", 404);
    }

    await client.query(
      `
      INSERT INTO usage_limits (user_id, rag_type, message_count)
      VALUES ($1, $2, 0)
      ON CONFLICT (user_id, rag_type) DO NOTHING
      `,
      [userId, chat.rag_type]
    );

    const usageRes = await client.query(
      "SELECT message_count FROM usage_limits WHERE user_id = $1 AND rag_type = $2",
      [userId, chat.rag_type]
    );
    const usage = usageRes.rows[0];
    if (usage && usage.message_count >= maxMessagesPerRag) {
      throw new ApiError("Limit reached", 403);
    }

    const userMsg = await client.query(
      "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at",
      [chatId, "user", message]
    );

    const history = await listRecentMessages(chatId, 10);
    const queryEmbedding = await aiService.createEmbedding(message);
    let contexts = await listRelevantChunks(
      userId,
      chat.rag_type,
      queryEmbedding,
      6
    );
    if (contexts.length === 0 && !vectorStore.usePinecone()) {
      const fallback = await vectorStore.listLatestDocumentChunks(
        userId,
        chat.rag_type,
        8
      );
      if (fallback.length > 0) {
        contexts = fallback;
      }
    }
    const documents = await listDocumentsForRag(userId, chat.rag_type, 10);
    const resumeScore = await resumeScoring.computeResumeScore({
      userId,
      ragType: chat.rag_type,
      message,
      history,
    });
    const financeData =
      chat.rag_type === "expense"
        ? await financeService.getFinanceData(message)
        : null;
    const aiText = await aiService.generateResponse({
      ragType: chat.rag_type,
      message,
      history,
      contexts,
      documents,
      resumeScore,
      financeData,
    });

    const aiMsg = await client.query(
      "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at",
      [chatId, "ai", aiText]
    );

    await incrementUsage(client, userId, chat.rag_type);

    await client.query("COMMIT");
    const aiMsgRow = aiMsg.rows[0];
    return {
      userMessage: userMsg.rows[0],
      aiMessage: aiMsgRow,
      message: aiMsgRow?.content ?? "",
      message_id: aiMsgRow?.id ?? null,
      usage: (usage?.message_count || 0) + 1,
      ragType: chat.rag_type,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getChatById,
  getUsage,
  runRagQuery,
};
