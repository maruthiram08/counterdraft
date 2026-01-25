-- Add hierarchy columns to content_items for Genealogy tracking
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS root_belief_id UUID REFERENCES beliefs(id),
ADD COLUMN IF NOT EXISTS parent_belief_id UUID REFERENCES beliefs(id);

-- Migration index for the new columns
CREATE INDEX IF NOT EXISTS idx_content_items_root_belief_id ON content_items(root_belief_id);
CREATE INDEX IF NOT EXISTS idx_content_items_parent_belief_id ON content_items(parent_belief_id);

-- Comment for documentation
COMMENT ON COLUMN content_items.root_belief_id IS 'Top-level belief this draft belongs to (Genealogy Root)';
COMMENT ON COLUMN content_items.parent_belief_id IS 'Immediate parent belief/pillar for this draft';
