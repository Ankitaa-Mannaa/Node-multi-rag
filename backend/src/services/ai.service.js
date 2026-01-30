const OpenAI = require("openai");
const crypto = require("crypto");
const pool = require("../config/db");
const ApiError = require("../utils/ApiError");
const { getPromptForRag } = require("../prompts");
const {
  openrouterApiKey,
  openrouterBaseUrl,
  openrouterModel,
  openrouterModelResume,
  openrouterModelSupport,
  openrouterModelGeneral,
  openrouterModelExpense,
  openrouterEmbeddingModel,
  openrouterMaxOutputTokens,
  openrouterMaxPromptChars,
  embeddingDim,
} = require("../config/env");

let openrouterClient;

const getOpenRouter = () => {
  if (!openrouterApiKey) {
    throw new ApiError("OPENROUTER_API_KEY is not set", 500);
  }
  if (!openrouterClient) {
    openrouterClient = new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: openrouterBaseUrl,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Multi-RAG AI Workspace",
      },
    });
  }
  return openrouterClient;
};

const parseAffordableTokens = (err) => {
  const msg = err?.message || "";
  const match = msg.match(/can only afford\s+(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const createResponseWithBudget = async (client, payload, maxTokens) => {
  try {
    return await client.responses.create({
      ...payload,
      max_output_tokens: maxTokens,
    });
  } catch (err) {
    const affordable = parseAffordableTokens(err);
    if (affordable && affordable > 0 && affordable < maxTokens) {
      return await client.responses.create({
        ...payload,
        max_output_tokens: affordable,
      });
    }
    throw err;
  }
};

const getModelForRag = (ragType) => {
  switch (ragType) {
    case "resume":
      return openrouterModelResume || openrouterModel;
    case "support":
      return openrouterModelSupport || openrouterModel;
    case "expense":
      return openrouterModelExpense || openrouterModel;
    case "general":
      return openrouterModelGeneral || openrouterModel;
    default:
      return openrouterModel;
  }
};

/**
 * Build the user-facing prompt: RAG-specific prefix + context + history + message.
 * Used so each RAG (support, resume, expense, general) gets the right instructions.
 */
function formatDocumentsList(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return "No uploaded documents were found for this RAG.";
  }
  return documents
    .map((doc, idx) => {
      const createdAt = doc.created_at
        ? new Date(doc.created_at).toISOString()
        : "unknown date";
      return `${idx + 1}. ${doc.file_name || "Untitled"} (id: ${doc.id}, status: ${doc.status}, uploaded: ${createdAt})`;
    })
    .join("\n");
}

function formatResumeScore(resumeScore) {
  if (!resumeScore) return "No ML score computed for this request.";
  if (resumeScore.requires_score_choice) {
    return "ML score not computed. Ask the user whether they want a generic resume quality score or a job-description match score.";
  }
  if (resumeScore.requires_job_description) {
    return "ML score not computed. Job description is required for accurate scoring.";
  }
  const lines = [
    `type: ${resumeScore.type || "job"}`,
    `overall_score: ${resumeScore.score}/100`,
    `similarity: ${resumeScore.similarity}`,
    `note: ${resumeScore.note}`,
  ];
  if (Array.isArray(resumeScore.criteria) && resumeScore.criteria.length) {
    lines.push("criteria:");
    resumeScore.criteria.forEach((c) => {
      lines.push(`  - ${c.label}: ${c.score}/100`);
    });
  }
  if (Array.isArray(resumeScore.top_matches) && resumeScore.top_matches.length) {
    lines.push("top_matches:");
    resumeScore.top_matches.forEach((m, idx) => {
      const label = m.file_name ? `${m.file_name}` : "resume";
      lines.push(
        `  ${idx + 1}. ${label} | chunk ${m.chunk_index ?? "?"} | score ${m.score}`
      );
    });
  }
  return lines.join("\n");
}

function formatFinanceData(financeData) {
  if (!financeData) return null;
  const lines = [];
  if (Array.isArray(financeData.quotes) && financeData.quotes.length) {
    lines.push("quotes:");
    financeData.quotes.forEach((q) => {
      const price = q.quote?.c ?? null;
      const change = q.quote?.d ?? null;
      const pct = q.quote?.dp ?? null;
      lines.push(
        `  - ${q.symbol}: price=${price ?? "n/a"}, change=${change ?? "n/a"}, change_pct=${pct ?? "n/a"}`
      );
    });
  }
  if (financeData.market_status) {
    lines.push("market_status:");
    lines.push(JSON.stringify(financeData.market_status));
  }
  if (Array.isArray(financeData.notes) && financeData.notes.length) {
    lines.push("notes:");
    financeData.notes.forEach((n) => lines.push(`  - ${n}`));
  }
  return lines.join("\n");
}

const trimText = (text, maxChars) => {
  if (!text || maxChars <= 0) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 15))}\n...[truncated]`;
};

const trimContexts = (contexts, maxChars) => {
  if (!Array.isArray(contexts) || contexts.length === 0) return "";
  if (typeof contexts[0] === "string") {
    return trimText(contexts.join("\n\n---\n\n"), maxChars);
  }
  let remaining = maxChars;
  const parts = [];
  for (const ctx of contexts) {
    const header = ctx.fileName
      ? `### ${ctx.fileName} (id: ${ctx.documentId || "unknown"})\n`
      : `### Document ${ctx.documentId || "unknown"}\n`;
    const chunkLine =
      (typeof ctx.chunkIndex === "number" ? `- [chunk ${ctx.chunkIndex}] ` : "- ") +
      (ctx.content || "");
    const block = `${header}${chunkLine}`;
    if (block.length > remaining) break;
    parts.push(block);
    remaining -= block.length + 1;
  }
  return trimText(parts.join("\n"), maxChars);
};

function formatContexts(contexts) {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return "No relevant document context was found for this query.";
  }
  if (typeof contexts[0] === "string") {
    return contexts.join("\n\n---\n\n");
  }

  const grouped = new Map();
  for (const ctx of contexts) {
    const key = ctx.documentId || "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(ctx);
  }

  const sections = [];
  for (const [docId, items] of grouped.entries()) {
    const label = items[0]?.fileName
      ? `${items[0].fileName} (id: ${docId})`
      : `Document ${docId}`;
    sections.push(`### ${label}`);
    items.forEach((item) => {
      const prefix =
        typeof item.chunkIndex === "number"
          ? `- [chunk ${item.chunkIndex}] `
          : "- ";
      sections.push(`${prefix}${item.content}`);
    });
    sections.push("");
  }
  return sections.join("\n");
}

function buildUserPrompt({
  ragType,
  message,
  history,
  contexts,
  documents,
  resumeScore,
  financeData,
}) {
  const { userPrefix } = getPromptForRag(ragType);
  const historyTextRaw =
    history.length > 0
      ? history.map((m) => `${m.role}: ${m.content}`).join("\n")
      : "No previous messages in this chat.";
  const documentsText = formatDocumentsList(documents);
  const resumeScoreText = ragType === "resume" ? formatResumeScore(resumeScore) : null;
  const financeText = ragType === "expense" ? formatFinanceData(financeData) : null;

  const parts = [
    userPrefix,
    "",
    "## Uploaded documents",
    documentsText,
    "",
  ];

  if (resumeScoreText) {
    parts.push("## ML resume score (if available)");
    parts.push(resumeScoreText);
    parts.push("");
  }

  if (financeText) {
    parts.push("## Live market data (if available)");
    parts.push(financeText);
    parts.push("");
  }

  const base = parts.join("\n");
  const fixedTail = [
    "## Context (from uploaded documents)",
    "",
    "## Conversation history",
    "",
    "## User message",
    message || "",
  ].join("\n");

  const totalBudget = openrouterMaxPromptChars || 12000;
  const used = base.length + fixedTail.length;
  const available = Math.max(0, totalBudget - used);
  const contextBudget = Math.floor(available * 0.7);
  const historyBudget = available - contextBudget;

  const contextText =
    trimContexts(contexts, contextBudget || 0) ||
    "No relevant document context was found for this query.";
  const historyText = trimText(historyTextRaw, historyBudget || 0);

  parts.push(
    "## Context (from uploaded documents)",
    contextText,
    "",
    "## Conversation history",
    historyText,
    "",
    "## User message",
    message
  );

  return parts.join("\n");
}

/**
 * Generate RAG response with RAG-specific system prompt and built user prompt.
 * @param {Object} opts
 * @param {string} opts.ragType - support | resume | expense | general
 * @param {string} opts.message - current user message
 * @param {Array<{ role: string, content: string }>} opts.history - recent messages
 * @param {string[]} opts.contexts - retrieved chunk contents
 * @returns {Promise<string>} AI response text
 */
const generateResponse = async ({
  ragType,
  message,
  history = [],
  contexts = [],
  documents = [],
  resumeScore = null,
  financeData = null,
}) => {
  const { system } = getPromptForRag(ragType);
  const model = getModelForRag(ragType);
  const userContent = buildUserPrompt({
    ragType,
    message,
    history,
    contexts,
    documents,
    resumeScore,
    financeData,
  });

  const client = getOpenRouter();
  const res = await createResponseWithBudget(
    client,
    {
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    },
    openrouterMaxOutputTokens
  );
  return res.output_text || "";
};

/**
 * Legacy single-prompt entry (e.g. if something still passes a raw prompt string).
 * Prefer generateResponse with ragType, message, history, contexts.
 */
const generateResponseFromPrompt = async ({ prompt, ragType }) => {
  const { system } = getPromptForRag(ragType || "general");
  const model = getModelForRag(ragType || "general");
  const client = getOpenRouter();
  const res = await createResponseWithBudget(
    client,
    {
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
    openrouterMaxOutputTokens
  );
  return res.output_text || "";
};

const createEmbedding = async (text) => {
  const client = getOpenRouter();
  const supportsDimensions = /(^|\/)text-embedding-3-(small|large)$/.test(
    openrouterEmbeddingModel
  );
  const hash = crypto
    .createHash("sha256")
    .update(`${openrouterEmbeddingModel}:${embeddingDim || ""}:${text}`)
    .digest("hex");

  try {
    const cached = await pool.query(
      `
      SELECT embedding
      FROM embedding_cache
      WHERE text_hash = $1 AND model = $2 AND dimensions = $3
      LIMIT 1
      `,
      [hash, openrouterEmbeddingModel, embeddingDim || 0]
    );
    if (cached.rows[0]?.embedding?.length) {
      return cached.rows[0].embedding;
    }
  } catch (err) {
    // cache miss or table not available; continue
  }

  const payload = {
    model: openrouterEmbeddingModel,
    input: text,
  };
  if (embeddingDim && supportsDimensions) {
    payload.dimensions = embeddingDim;
  }
  const res = await client.embeddings.create(payload);
  const vector = res.data[0].embedding;
  if (embeddingDim && vector.length && vector.length !== embeddingDim) {
    throw new ApiError(
      `Embedding dimension mismatch: got ${vector.length}, expected ${embeddingDim}. Check EMBEDDING_DIM and your embedding model (or set dimensions for text-embedding-3-*).`,
      500
    );
  }
  try {
    await pool.query(
      `
      INSERT INTO embedding_cache (text_hash, model, dimensions, embedding)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (text_hash, model, dimensions) DO NOTHING
      `,
      [hash, openrouterEmbeddingModel, embeddingDim || 0, vector]
    );
  } catch (err) {
    // ignore cache write failures
  }
  return vector;
};

module.exports = {
  generateResponse,
  generateResponseFromPrompt,
  createEmbedding,
  buildUserPrompt,
};
