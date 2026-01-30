/**
 * Vector store abstraction: Pinecone (when configured) or pgvector.
 * Pinecone index: multi-rag, 1024 dimensions, cosine metric (per user config).
 */

const { pineconeApiKey, pineconeIndex, embeddingDim } = require("../config/env");
const pool = require("../config/db");
const { toPgVector } = require("../utils/pgvector");

let pineconeClient = null;
let pineconeIndexRef = null;

async function getPineconeIndex() {
  if (!pineconeApiKey || !pineconeIndex) return null;
  if (pineconeIndexRef) return pineconeIndexRef;
  try {
    const { Pinecone } = require("@pinecone-database/pinecone");
    pineconeClient = new Pinecone({ apiKey: pineconeApiKey });
    pineconeIndexRef = pineconeClient.Index(pineconeIndex);
    return pineconeIndexRef;
  } catch (err) {
    console.warn("[vectorStore] Pinecone init failed:", err.message);
    return null;
  }
}

/**
 * Namespace for Pinecone: isolate by user and RAG type.
 * @param {string} userId - UUID
 * @param {string} ragType - support | resume | expense | general
 */
function namespace(userId, ragType) {
  return `${userId}_${ragType}`;
}

/**
 * Fetch relevant chunks by vector similarity.
 * @param {string} userId - UUID
 * @param {string} ragType - support | resume | expense | general
 * @param {number[]} embedding - query vector
 * @param {number} limit - max chunks to return
 * @returns {Promise<string[]>} chunk content strings
 */
async function listRelevantChunks(userId, ragType, embedding, limit = 6) {
  const idx = await getPineconeIndex();
  if (idx) {
    const ns = namespace(userId, ragType);
    const res = await idx.namespace(ns).query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
    });
    const matches = res.matches || [];
    return matches
      .filter((m) => m.metadata && m.metadata.content)
      .map((m) => m.metadata.content);
  }

  const res = await pool.query(
    `
    SELECT c.content
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.user_id = $1 AND c.rag_type = $2 AND d.status = 'ready'
    ORDER BY c.embedding <-> $3
    LIMIT $4
    `,
    [userId, ragType, toPgVector(embedding), limit]
  );
  return res.rows.map((row) => row.content);
}

/**
 * Fallback: return the earliest chunks for the most recent ready document.
 * Useful for broad "summarize the document" queries when similarity yields nothing.
 */
async function listLatestDocumentChunks(userId, ragType, limit = 6) {
  const docRes = await pool.query(
    `
    SELECT id
    FROM documents
    WHERE user_id = $1 AND rag_type = $2 AND status = 'ready'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId, ragType]
  );
  const doc = docRes.rows[0];
  if (!doc) return [];

  const res = await pool.query(
    `
    SELECT content
    FROM document_chunks
    WHERE document_id = $1
    ORDER BY chunk_index ASC
    LIMIT $2
    `,
    [doc.id, limit]
  );
  return res.rows.map((row) => row.content);
}

/**
 * Upsert chunks for a document (used after embedding in job).
 * @param {string} documentId - UUID
 * @param {string} userId - UUID
 * @param {string} ragType - support | resume | expense | general
 * @param {Array<{ content: string, embedding: number[], chunkIndex: number }>} chunks
 */
async function upsertChunks(documentId, userId, ragType, chunks) {
  const idx = await getPineconeIndex();
  if (idx) {
    const ns = namespace(userId, ragType);
    const vectors = chunks.map((c) => ({
      id: `${documentId}_${c.chunkIndex}`,
      values: c.embedding,
      metadata: {
        document_id: documentId,
        user_id: userId,
        rag_type: ragType,
        chunk_index: c.chunkIndex,
        content: c.content,
      },
    }));
    await idx.namespace(ns).upsert(vectors);
    return;
  }

  for (const c of chunks) {
    await pool.query(
      `
      INSERT INTO document_chunks (document_id, user_id, rag_type, chunk_index, content, embedding)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [documentId, userId, ragType, c.chunkIndex, c.content, toPgVector(c.embedding)]
    );
  }
}

/**
 * Delete all vectors for a document (e.g. when document is deleted).
 * @param {string} documentId - UUID
 * @param {string} userId - UUID
 * @param {string} ragType - support | resume | expense | general
 */
async function deleteByDocument(documentId, userId, ragType) {
  const idx = await getPineconeIndex();
  if (idx) {
    const ns = namespace(userId, ragType);
    const prefix = `${documentId}_`;
    const ids = [];
    try {
      const nsIndex = idx.namespace(ns);
      if (typeof nsIndex.list === "function") {
        for await (const batch of nsIndex.list({ prefix, limit: 100 })) {
          const batchIds = Array.isArray(batch) ? batch : (batch.vectors || []).map((v) => (typeof v === "string" ? v : v.id));
          ids.push(...batchIds);
        }
      }
      if (ids.length) await idx.namespace(ns).deleteMany(ids);
    } catch (e) {
      console.warn("[vectorStore] Pinecone deleteByDocument:", e.message);
    }
    return;
  }

  await pool.query("DELETE FROM document_chunks WHERE document_id = $1", [
    documentId,
  ]);
}

function usePinecone() {
  return Boolean(pineconeApiKey && pineconeIndex);
}

module.exports = {
  listRelevantChunks,
  listLatestDocumentChunks,
  upsertChunks,
  deleteByDocument,
  getPineconeIndex,
  usePinecone,
};
