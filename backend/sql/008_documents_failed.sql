ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS error_message TEXT;
