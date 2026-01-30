const pool = require("../config/db");

const searchChunksBM25 = async (userId, ragType, query, limit = 6, documentIds = []) => {
  const params = [userId, ragType, query];
  let sql = `
    SELECT content, chunk_index, document_id, d.file_name,
           ts_rank_cd(content_tsv, plainto_tsquery('english', $3)) AS score
    FROM document_chunks_text
    JOIN documents d ON d.id = document_chunks_text.document_id
    WHERE document_chunks_text.user_id = $1
      AND document_chunks_text.rag_type = $2
      AND d.status = 'ready'
  `;

  if (documentIds.length > 0) {
    params.push(documentIds);
    sql += ` AND document_chunks_text.document_id = ANY($${params.length}::uuid[])`;
  }

  params.push(limit);
  sql += ` ORDER BY score DESC LIMIT $${params.length}`;

  const res = await pool.query(sql, params);
  return res.rows.map((row) => ({
    content: row.content,
    score: Number(row.score) || 0,
    documentId: row.document_id,
    fileName: row.file_name,
    chunkIndex: row.chunk_index,
  }));
};

module.exports = {
  searchChunksBM25,
};
