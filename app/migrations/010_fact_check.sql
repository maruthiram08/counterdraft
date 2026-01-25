-- Fact Check Verification Schema

CREATE TABLE IF NOT EXISTS content_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  
  -- The claim extracted from the text
  claim_text TEXT NOT NULL,
  
  -- Verification Result
  status VARCHAR(20) NOT NULL CHECK (status IN ('verified', 'disputed', 'unverified')),
  confidence_score FLOAT DEFAULT 0.0,
  
  -- Evidence
  source_url TEXT,
  source_snippet TEXT,
  analysis_content TEXT, -- LLM explanation of why it matches or not
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_verifications_draft ON content_verifications(draft_id);
