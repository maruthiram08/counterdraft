-- User Interests Table for Explorer Module
-- Stores the user's selected topic preferences for curated feed

CREATE TABLE IF NOT EXISTS user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    categories TEXT[] DEFAULT '{}', -- e.g., ['tech', 'business']
    subcategories TEXT[] DEFAULT '{}', -- e.g., ['tech.ai.ethics', 'business.strategy']
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own interests
CREATE POLICY "Users can manage their own interests"
ON user_interests
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
