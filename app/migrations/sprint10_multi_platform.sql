-- Sprint 10: Multi-Platform Integration (Database Foundation)
-- Migration for connected accounts, published posts, and belief confidence model

-- ===========================================
-- CONNECTED ACCOUNTS (Platform-agnostic OAuth tokens)
-- ===========================================
CREATE TABLE connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,              -- 'linkedin', 'notion', 'google_docs'
    platform_user_id VARCHAR(255),              -- Platform's user identifier
    access_token TEXT NOT NULL,                 -- OAuth access token
    refresh_token TEXT,                         -- OAuth refresh token (if available)
    token_expires_at TIMESTAMP WITH TIME ZONE,  -- When access token expires
    scopes TEXT[],                              -- Granted OAuth scopes
    profile_name VARCHAR(255),                  -- Display name from platform
    profile_picture TEXT,                       -- Avatar URL from platform
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)                   -- One connection per platform per user
);

CREATE INDEX idx_connected_accounts_user_id ON connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_platform ON connected_accounts(platform);

-- ===========================================
-- PUBLISHED POSTS (Draft → Platform post mapping)
-- ===========================================
CREATE TABLE published_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,              -- 'linkedin', etc.
    platform_post_id VARCHAR(255),              -- Platform's post identifier (URN, etc.)
    adapted_content TEXT,                       -- What was actually published (may differ from draft)
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_published_posts_user_id ON published_posts(user_id);
CREATE INDEX idx_published_posts_draft_id ON published_posts(draft_id);
CREATE INDEX idx_published_posts_platform ON published_posts(platform);

-- ===========================================
-- UPDATE RAW_POSTS: Add belief eligibility flag
-- ===========================================
ALTER TABLE raw_posts 
ADD COLUMN IF NOT EXISTS is_belief_eligible BOOLEAN DEFAULT TRUE;

-- Add platform post ID for tracking imported content
ALTER TABLE raw_posts 
ADD COLUMN IF NOT EXISTS platform_post_id VARCHAR(255);

-- ===========================================
-- UPDATE BELIEFS: Add confidence model fields
-- ===========================================
-- Note: 'confidence' column already exists, we'll use it differently
-- Adding new columns for the confidence model

-- Confidence level (ordinal: low, medium, high)
ALTER TABLE beliefs 
ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20) DEFAULT 'medium' 
CHECK (confidence_level IN ('low', 'medium', 'high'));

-- Recency weight (0.0 to 1.0, decays over time)
ALTER TABLE beliefs 
ADD COLUMN IF NOT EXISTS recency_weight FLOAT DEFAULT 1.0;

-- Stability flag (stable = consistent over time, exploratory = new)
ALTER TABLE beliefs 
ADD COLUMN IF NOT EXISTS is_stable BOOLEAN DEFAULT FALSE;

-- Evidence count (how many posts support this belief)
ALTER TABLE beliefs 
ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 1;

-- ===========================================
-- UPDATE DRAFTS: Add LinkedIn post tracking
-- ===========================================
ALTER TABLE drafts 
ADD COLUMN IF NOT EXISTS linkedin_post_urn VARCHAR(255);

ALTER TABLE drafts 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- ===========================================
-- TRIGGERS
-- ===========================================
CREATE TRIGGER update_connected_accounts_updated_at
    BEFORE UPDATE ON connected_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;

-- Connected Accounts: Users can only see their own
CREATE POLICY connected_accounts_user_policy ON connected_accounts
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Published Posts: Users can only see their own
CREATE POLICY published_posts_user_policy ON published_posts
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE connected_accounts IS 'OAuth connections to external platforms (LinkedIn, Notion, etc.)';
COMMENT ON TABLE published_posts IS 'Tracks which drafts were published to which platforms';
COMMENT ON COLUMN raw_posts.is_belief_eligible IS 'Soft gate: only eligible posts feed into belief extraction';
COMMENT ON COLUMN beliefs.confidence_level IS 'Ordinal confidence: low, medium, high (not a math problem)';
COMMENT ON COLUMN beliefs.is_stable IS 'True if belief is consistent over time, false if exploratory';
