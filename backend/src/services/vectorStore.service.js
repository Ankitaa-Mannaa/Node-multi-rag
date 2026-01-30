/**
 * Vector store abstraction: Pinecone only.
 * If Pinecone is not configured, vector retrieval returns empty results.
 */

const { pineconeApiKey, pineconeIndex } = require("../config/env");
const pool = require("../config/db");

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
 */
function namespace(userId, ragType) {
  return `${userId}_${ragType}`;
}

async function backfillFileNames(items) {
  const missingFileNames = items
    .filter((i) => i.documentId && !i.fileName)
    .map((i) => i.documentId);
  if (!missingFileNames.length) return items;

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
  return items;
}

/**
 * Fetch relevant chunks by vector similarity.
 */
async function listRelevantChunks(userId, ragType, embedding, limit = 6, documentIds = []) {
  const idx = await getPineconeIndex();
  if (!idx) return [];

  const ns = namespace(userId, ragType);
  const filter =
    Array.isArray(documentIds) && documentIds.length > 0
      ? { document_id: { $in: documentIds } }
      : undefined;
  const res = await idx.namespace(ns).query({
    vector: embedding,
    topK: limit,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
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

  return backfillFileNames(items);
}

/**
 * Fetch relevant chunks with similarity scores (0..1).
 */
async function listRelevantChunksWithScores(
  userId,
  ragType,
  embedding,
  limit = 6,
  documentIds = []
) {
  const idx = await getPineconeIndex();
  if (!idx) return [];

  const ns = namespace(userId, ragType);
  const filter =
    Array.isArray(documentIds) && documentIds.length > 0
      ? { document_id: { $in: documentIds } }
      : undefined;
  const res = await idx.namespace(ns).query({
    vector: embedding,
    topK: limit,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
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

  return backfillFileNames(items);
}

/**
 * Fallback: return earliest chunks for the most recent ready document.
 * Uses BM25 text table (document_chunks_text) for fallback.
 */
async function listLatestDocumentChunks(userId, ragType, limit = 6, documentIds = []) {
  const params = [userId, ragType];
  let sql = `
    SELECT id, file_name
    FROM documents
    WHERE user_id = $1 AND rag_type = $2 AND status = 'ready'
  `;
  if (Array.isArray(documentIds) && documentIds.length > 0) {
    params.push(documentIds);
    sql += ` AND id = ANY($${params.length}::uuid[])`;
  }
  sql += ` ORDER BY created_at DESC LIMIT 1`;
  const docRes = await pool.query(sql, params);
  const doc = docRes.rows[0];
  if (!doc) return [];

  const res = await pool.query(
    `
    SELECT content, chunk_index
    FROM document_chunks_text
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
 * Pinecone only; no local vector fallback.
 */
async function upsertChunks(documentId, userId, ragType, chunks, fileName) {
  const idx = await getPineconeIndex();
  if (!idx) return;

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
}

/**
 * Delete all vectors for a document (e.g. when document is deleted).
 */
async function deleteByDocument(documentId, userId, ragType) {
  const idx = await getPineconeIndex();
  if (!idx) return;

  const ns = namespace(userId, ragType);
  const prefix = `${documentId}_`;
  const ids = [];
  try {
    const nsIndex = idx.namespace(ns);
    if (typeof nsIndex.list === "function") {
      for await (const batch of nsIndex.list({ prefix, limit: 100 })) {
        const batchIds = Array.isArray(batch)
          ? batch
          : (batch.vectors || []).map((v) => (typeof v === "string" ? v : v.id));
        ids.push(...batchIds);
      }
    }
    if (ids.length) await idx.namespace(ns).deleteMany(ids);
  } catch (e) {
    console.warn("[vectorStore] Pinecone deleteByDocument:", e.message);
  }
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
