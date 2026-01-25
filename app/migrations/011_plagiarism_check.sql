-- Plagiarism Check Schema

CREATE TABLE IF NOT EXISTS plagiarism_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  
  -- Overall uniqueness score (0-100)
  uniqueness_score INTEGER NOT NULL,
  
  -- List of matching URLs and their occurrences/snippets
  -- Format: [{ url: string, match_count: number, snippets: string[] }]
  matched_sources JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plagiarism_checks_draft ON plagiarism_checks(draft_id);
