const OpenAI = require("openai");
const ApiError = require("../utils/ApiError");
const { getPromptForRag } = require("../prompts");
const {
  openrouterApiKey,
  openrouterBaseUrl,
  openrouterModel,
  openrouterEmbeddingModel,
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

/**
 * Build the user-facing prompt: RAG-specific prefix + context + history + message.
 * Used so each RAG (support, resume, expense, general) gets the right instructions.
 */
function buildUserPrompt({ ragType, message, history, contexts }) {
  const { userPrefix } = getPromptForRag(ragType);
  const contextText =
    contexts.length > 0
      ? contexts.join("\n\n---\n\n")
      : "No relevant document context was found for this query.";
  const historyText =
    history.length > 0
      ? history.map((m) => `${m.role}: ${m.content}`).join("\n")
      : "No previous messages in this chat.";

  return [
    userPrefix,
    "",
    "## Context (from uploaded documents)",
    contextText,
    "",
    "## Conversation history",
    historyText,
    "",
    "## User message",
    message,
  ].join("\n");
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
const generateResponse = async ({ ragType, message, history = [], contexts = [] }) => {
  const { system } = getPromptForRag(ragType);
  const userContent = buildUserPrompt({
    ragType,
    message,
    history,
    contexts,
  });

  const client = getOpenRouter();
  const res = await client.responses.create({
    model: openrouterModel,
    input: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  return res.output_text || "";
};

/**
 * Legacy single-prompt entry (e.g. if something still passes a raw prompt string).
 * Prefer generateResponse with ragType, message, history, contexts.
 */
const generateResponseFromPrompt = async ({ prompt, ragType }) => {
  const { system } = getPromptForRag(ragType || "general");
  const client = getOpenRouter();
  const res = await client.responses.create({
    model: openrouterModel,
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return res.output_text || "";
};

const createEmbedding = async (text) => {
  const client = getOpenRouter();
  const supportsDimensions = /(^|\/)text-embedding-3-(small|large)$/.test(
    openrouterEmbeddingModel
  );
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
  return vector;
};

module.exports = {
  generateResponse,
  generateResponseFromPrompt,
  createEmbedding,
  buildUserPrompt,
};
