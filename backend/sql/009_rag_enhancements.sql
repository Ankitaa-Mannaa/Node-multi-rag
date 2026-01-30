-- Hybrid search text index and chat document selection

CREATE TABLE IF NOT EXISTS document_chunks_text (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rag_type rag_type NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_tsv tsvector NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS document_chunks_text_tsv_idx
  ON document_chunks_text USING GIN (content_tsv);

CREATE INDEX IF NOT EXISTS document_chunks_text_user_rag_idx
  ON document_chunks_text (user_id, rag_type);

CREATE TABLE IF NOT EXISTS chat_documents (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, document_id)
);

CREATE INDEX IF NOT EXISTS chat_documents_chat_idx
  ON chat_documents (chat_id);

CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (text_hash, model, dimensions)
);
