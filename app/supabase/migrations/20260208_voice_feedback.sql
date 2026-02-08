-- Create voice_feedback table to capture reinforcement learning data
CREATE TABLE IF NOT EXISTS voice_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    draft_id UUID,
    instruction TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_text TEXT,
    refined_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_voice_feedback_user_id ON voice_feedback(user_id);
