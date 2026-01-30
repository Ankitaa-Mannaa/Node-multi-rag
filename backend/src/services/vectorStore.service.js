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
 * @returns {Promise<Array<{ content: string, documentId?: string, fileName?: string, chunkIndex?: number }>>}
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
    const items = matches
      .filter((m) => m.metadata && m.metadata.content)
      .map((m) => ({
        content: m.metadata.content,
        documentId: m.metadata.document_id,
        fileName: m.metadata.file_name,
        chunkIndex: m.metadata.chunk_index,
      }));

    const missingFileNames = items
      .filter((i) => i.documentId && !i.fileName)
      .map((i) => i.documentId);
    if (missingFileNames.length) {
      const uniqueIds = [...new Set(missingFileNames)];
      const docRes = await pool.query(
        "SELECT id, file_name FROM documents WHERE id = ANY($1::uuid[])",
        [uniqueIds]
      );
      const nameById = new Map(docRes.rows.map((r) => [r.id, r.file_name]));
      items.forEach((i) => {
        if (!i.fileName && i.documentId) {
          i.fileName = nameById.get(i.documentId);
        }
      });
    }
    return items;
  }

  const res = await pool.query(
    `
    SELECT c.content, c.chunk_index, d.id AS document_id, d.file_name
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.user_id = $1 AND c.rag_type = $2 AND d.status = 'ready'
    ORDER BY c.embedding <-> $3
    LIMIT $4
    `,
    [userId, ragType, toPgVector(embedding), limit]
  );
  return res.rows.map((row) => ({
    content: row.content,
    documentId: row.document_id,
    fileName: row.file_name,
    chunkIndex: row.chunk_index,
  }));
}

/**
 * Fetch relevant chunks with similarity scores (0..1).
 * @param {string} userId - UUID
 * @param {string} ragType - support | resume | expense | general
 * @param {number[]} embedding - query vector
 * @param {number} limit - max chunks to return
 * @returns {Promise<Array<{ content: string, score: number, documentId?: string, fileName?: string, chunkIndex?: number }>>}
 */
async function listRelevantChunksWithScores(userId, ragType, embedding, limit = 6) {
  const idx = await getPineconeIndex();
  if (idx) {
    const ns = namespace(userId, ragType);
    const res = await idx.namespace(ns).query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
    });
    const matches = res.matches || [];
    const items = matches
      .filter((m) => m.metadata && m.metadata.content)
      .map((m) => ({
        content: m.metadata.content,
        score: typeof m.score === "number" ? m.score : 0,
        documentId: m.metadata.document_id,
        fileName: m.metadata.file_name,
        chunkIndex: m.metadata.chunk_index,
      }));

    const missingFileNames = items
      .filter((i) => i.documentId && !i.fileName)
      .map((i) => i.documentId);
    if (missingFileNames.length) {
      const uniqueIds = [...new Set(missingFileNames)];
      const docRes = await pool.query(
        "SELECT id, file_name FROM documents WHERE id = ANY($1::uuid[])",
        [uniqueIds]
      );
      const nameById = new Map(docRes.rows.map((r) => [r.id, r.file_name]));
      items.forEach((i) => {
        if (!i.fileName && i.documentId) {
          i.fileName = nameById.get(i.documentId);
        }
      });
    }
    return items;
  }

  const res = await pool.query(
    `
    SELECT c.content,
           c.chunk_index,
           d.id AS document_id,
           d.file_name,
           1 / (1 + (c.embedding <-> $3)) AS score
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.user_id = $1 AND c.rag_type = $2 AND d.status = 'ready'
    ORDER BY c.embedding <-> $3
    LIMIT $4
    `,
    [userId, ragType, toPgVector(embedding), limit]
  );
  return res.rows.map((row) => ({
    content: row.content,
    score: Number(row.score) || 0,
    documentId: row.document_id,
    fileName: row.file_name,
    chunkIndex: row.chunk_index,
  }));
}

/**
 * Fallback: return the earliest chunks for the most recent ready document.
 * Useful for broad "summarize the document" queries when similarity yields nothing.
 */
async function listLatestDocumentChunks(userId, ragType, limit = 6) {
  const docRes = await pool.query(
    `
    SELECT id, file_name
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
    SELECT content, chunk_index
    FROM document_chunks
    WHERE document_id = $1
    ORDER BY chunk_index ASC
    LIMIT $2
    `,
    [doc.id, limit]
  );
  return res.rows.map((row) => ({
    content: row.content,
    documentId: doc.id,
    fileName: doc.file_name,
    chunkIndex: row.chunk_index,
  }));
}

/**
 * Upsert chunks for a document (used after embedding in job).
 * @param {string} documentId - UUID
 * @param {string} userId - UUID
 * @param {string} ragType - support | resume | expense | general
 * @param {Array<{ content: string, embedding: number[], chunkIndex: number }>} chunks
 */
async function upsertChunks(documentId, userId, ragType, chunks, fileName) {
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
        file_name: fileName,
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
  listRelevantChunksWithScores,
  listLatestDocumentChunks,
  upsertChunks,
  deleteByDocument,
  getPineconeIndex,
  usePinecone,
};
