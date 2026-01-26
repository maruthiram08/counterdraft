-- Migration: Add brain_metadata and dev_step to content_items
-- Sprint 14: New Draft Modal Foundation
-- Date: 2026-01-19

-- Add brain_metadata column to store Brain decision inputs and outputs
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS brain_metadata JSONB;

-- Add dev_step column to track wizard progress
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS dev_step TEXT;

-- Add index on dev_step for faster filtering of in-development items
CREATE INDEX IF NOT EXISTS idx_content_items_dev_step ON content_items(dev_step);

-- Add index on brain_metadata for searching by outcome
CREATE INDEX IF NOT EXISTS idx_content_items_brain_metadata ON content_items USING GIN (brain_metadata);

-- Comments for documentation
COMMENT ON COLUMN content_items.brain_metadata IS 'JSONB storing Brain decision data: outcome, audience, stance, confidence, source';
COMMENT ON COLUMN content_items.dev_step IS 'Current step in Development Wizard: null, deep_dive_complete, outline_complete, etc.';
