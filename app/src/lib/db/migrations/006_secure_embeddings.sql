-- Migration: Secure Embeddings with User ID
-- 1. Add user_id column if not exists
ALTER TABLE content_embeddings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_id ON content_embeddings(user_id);

-- 3. Update the match_embeddings function to filter by user_id
-- We drop it first to ensure signature update
DROP FUNCTION IF EXISTS match_embeddings;

CREATE OR REPLACE FUNCTION match_embeddings (
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_type text DEFAULT null,
  filter_user_id uuid DEFAULT null
) RETURNS TABLE (
  id bigint,
  content_id text,
  content_type text,
  content_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    content_embeddings.id,
    content_embeddings.content_id,
    content_embeddings.content_type,
    content_embeddings.content_text,
    1 - (content_embeddings.embedding <=> query_embedding) AS similarity
  FROM content_embeddings
  WHERE 1 - (content_embeddings.embedding <=> query_embedding) > 0.5 -- Threshold
  AND (filter_type IS NULL OR content_type = filter_type)
  AND (filter_user_id IS NULL OR user_id = filter_user_id) -- Critical Security Filter
  ORDER BY content_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
