const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrls: (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 120,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterBaseUrl:
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  openrouterModel: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash",
  openrouterModelResume:
    process.env.OPENROUTER_MODEL_RESUME || process.env.OPENROUTER_MODEL,
  openrouterModelSupport:
    process.env.OPENROUTER_MODEL_SUPPORT || process.env.OPENROUTER_MODEL,
  openrouterModelGeneral:
    process.env.OPENROUTER_MODEL_GENERAL || process.env.OPENROUTER_MODEL,
  openrouterModelExpense:
    process.env.OPENROUTER_MODEL_EXPENSE || process.env.OPENROUTER_MODEL,
  openrouterEmbeddingModel:
    process.env.OPENROUTER_EMBEDDING_MODEL || "text-embedding-3-large",
  openrouterMaxOutputTokens: Number(process.env.OPENROUTER_MAX_OUTPUT_TOKENS) || 2048,
  openrouterMaxPromptChars: Number(process.env.OPENROUTER_MAX_PROMPT_CHARS) || 12000,
  embeddingDim: Number(process.env.EMBEDDING_DIM) || 1024,
  maxMessagesPerRag: Number(process.env.MAX_MESSAGES_PER_RAG) || 20,
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
  // RAG retrieval tuning
  hybridAlpha: Number(process.env.HYBRID_ALPHA) || 0.7,
  hybridTopK: Number(process.env.HYBRID_TOP_K) || 8,
  rerankerProvider: process.env.RERANKER_PROVIDER || "none",
  rerankerApiKey: process.env.RERANKER_API_KEY,
  rerankerModel: process.env.RERANKER_MODEL,
  rerankerBaseUrl: process.env.RERANKER_BASE_URL,
  rerankerTopK: Number(process.env.RERANKER_TOP_K) || 6,
  // Pinecone (required for vector search; no local fallback)
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeIndex: process.env.PINECONE_INDEX || "multi-rag",
  // Finance data providers (optional)
  finnhubApiKey: process.env.FINNHUB_API_KEY,
  finageApiKey: process.env.FINAGE_API_KEY,
};
