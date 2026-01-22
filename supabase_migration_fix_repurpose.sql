-- Add missing columns for Repurpose flow
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES drafts(id);
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS root_id UUID REFERENCES drafts(id);
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS platform VARCHAR;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS platform_metadata JSONB DEFAULT '{}';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_drafts_parent ON drafts(parent_id);
CREATE INDEX IF NOT EXISTS idx_drafts_root ON drafts(root_id);

-- Verify it worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drafts' 
AND column_name IN ('parent_id', 'root_id', 'platform_metadata');
