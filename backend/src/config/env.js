const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 120,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterBaseUrl:
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  openrouterModel: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash",
  openrouterEmbeddingModel:
    process.env.OPENROUTER_EMBEDDING_MODEL || "text-embedding-3-large",
  embeddingDim: Number(process.env.EMBEDDING_DIM) || 1024,
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
  // Pinecone (optional; if set, used for vector store instead of pgvector)
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeIndex: process.env.PINECONE_INDEX || "multi-rag",
};
