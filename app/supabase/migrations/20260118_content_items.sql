-- Content Items Table (Unified content pipeline)
-- Replaces separate drafts/ideas tables with unified model

CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    hook TEXT,
    angle TEXT,
    format TEXT,
    deep_dive JSONB,
    outline JSONB,
    draft_content TEXT,
    
    -- State
    stage TEXT DEFAULT 'idea' CHECK (stage IN ('idea', 'developing', 'draft', 'published')),
    dev_step TEXT CHECK (dev_step IN ('deep_dive', 'outline', 'generating', NULL)),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    
    -- Provenance
    source_type TEXT CHECK (source_type IN ('explore', 'tension', 'belief', 'manual')),
    source_id UUID,
    source_topics TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ,
    
    -- Publishing
    platform TEXT,
    platform_post_id TEXT
);

-- Index for fast lookups by user and stage
CREATE INDEX idx_content_items_user_stage ON content_items(user_id, stage);
CREATE INDEX idx_content_items_status ON content_items(user_id, status);

-- Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own content
CREATE POLICY "Users can manage their own content items"
    ON content_items FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);
