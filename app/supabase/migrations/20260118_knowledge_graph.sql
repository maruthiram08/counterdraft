-- Enable pgvector extension (run this first if not already enabled)
-- Note: You may need to enable this in Supabase dashboard under Database > Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Store embeddings for similarity search
CREATE TABLE IF NOT EXISTS content_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL, -- belief, tension, post, idea, topic
    content_text TEXT,          -- The text that was embedded
    embedding VECTOR(1536),     -- OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS content_embeddings_embedding_idx 
ON content_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for content lookup
CREATE INDEX IF NOT EXISTS content_embeddings_content_idx 
ON content_embeddings (content_id, content_type);

-- Store explicit connections (optional user-created backlinks)
CREATE TABLE IF NOT EXISTS content_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL,
    source_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    connection_type TEXT DEFAULT 'semantic', -- semantic, explicit, derived
    weight FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for connection lookups
CREATE INDEX IF NOT EXISTS content_connections_source_idx 
ON content_connections (source_id, source_type);

CREATE INDEX IF NOT EXISTS content_connections_target_idx 
ON content_connections (target_id, target_type);

-- RLS Policies (since embeddings are tied to user content)
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_connections ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies would need to join with the parent content table
-- For now, we'll handle access control at the API level

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 5,
    filter_type TEXT DEFAULT NULL
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
    RETURN QUERY
    SELECT 
        ce.id,
        ce.content_id,
        ce.content_type,
        ce.content_text,
        1 - (ce.embedding <=> query_embedding) AS similarity
    FROM content_embeddings ce
    WHERE (filter_type IS NULL OR ce.content_type = filter_type)
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
