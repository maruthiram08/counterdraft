-- Sprint 3 Migration: Add text columns and make IDs nullable for tensions

-- Add text columns for display (when belief ID matching fails)
ALTER TABLE tensions ADD COLUMN IF NOT EXISTS belief_a_text TEXT;
ALTER TABLE tensions ADD COLUMN IF NOT EXISTS belief_b_text TEXT;

-- Make belief IDs nullable (tension may reference beliefs by text only)
ALTER TABLE tensions ALTER COLUMN belief_a_id DROP NOT NULL;
ALTER TABLE tensions ALTER COLUMN belief_b_id DROP NOT NULL;
