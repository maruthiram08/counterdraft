-- Add user_id to knowledge graph tables for multi-tenant security

-- 1. content_embeddings
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_id ON content_embeddings(user_id);

-- 2. content_connections
ALTER TABLE content_connections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_content_connections_user_id ON content_connections(user_id);

-- 3. Update match_embeddings function to enforce user_id filtering
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 5,
    filter_type TEXT DEFAULT NULL,
    filter_user_id UUID DEFAULT NULL -- New parameter
)
RETURNS TABLE (
    id UUID,
    content_id UUID,
    content_type TEXT,
    content_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Security Check: filter_user_id MUST be provided
    IF filter_user_id IS NULL THEN
        RAISE EXCEPTION 'filter_user_id is required for security isolation';
    END IF;

    RETURN QUERY
    SELECT 
        ce.id,
        ce.content_id,
        ce.content_type,
        ce.content_text,
        1 - (ce.embedding <=> query_embedding) AS similarity
    FROM content_embeddings ce
    WHERE ce.user_id = filter_user_id -- Enforce isolation
    AND (filter_type IS NULL OR ce.content_type = filter_type)
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 4. Enable RLS with proper policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own embeddings" ON content_embeddings;
CREATE POLICY "Users can manage their own embeddings"
    ON content_embeddings FOR ALL
    USING (user_id::text = auth.uid()::text)
    WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can manage their own connections" ON content_connections;
CREATE POLICY "Users can manage their own connections"
    ON content_connections FOR ALL
    USING (user_id::text = auth.uid()::text)
    WITH CHECK (user_id::text = auth.uid()::text);
