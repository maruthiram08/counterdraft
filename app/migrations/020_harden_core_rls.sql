-- Migration 020: Harden Core RLS
-- Enables RLS on core tables and ensures they are denied-by-default for PostgREST
-- This protects against unauthorized access via the exposed anon key.

-- 1. Enable RLS on all core business tables
ALTER TABLE beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE belief_evidence ENABLE ROW LEVEL SECURITY;

-- 2. "Deny All" for public and authenticated roles
-- Since this app uses service_role for all server-side operations, 
-- we explicit block public/anon and authenticated users from accessing these tables directly.

-- Beliefs
DROP POLICY IF EXISTS "Deny all public beliefs" ON beliefs;
CREATE POLICY "Deny all public beliefs" ON beliefs FOR ALL TO public USING (false);

-- Drafts
DROP POLICY IF EXISTS "Deny all public drafts" ON drafts;
CREATE POLICY "Deny all public drafts" ON drafts FOR ALL TO public USING (false);

-- Tensions
DROP POLICY IF EXISTS "Deny all public tensions" ON tensions;
CREATE POLICY "Deny all public tensions" ON tensions FOR ALL TO public USING (false);

-- Idea Directions
DROP POLICY IF EXISTS "Deny all public idea_directions" ON idea_directions;
CREATE POLICY "Deny all public idea_directions" ON idea_directions FOR ALL TO public USING (false);

-- Raw Posts
DROP POLICY IF EXISTS "Deny all public raw_posts" ON raw_posts;
CREATE POLICY "Deny all public raw_posts" ON raw_posts FOR ALL TO public USING (false);

-- Belief Evidence
DROP POLICY IF EXISTS "Deny all public belief_evidence" ON belief_evidence;
CREATE POLICY "Deny all public belief_evidence" ON belief_evidence FOR ALL TO public USING (false);

-- Note: Service Role (the default when bypassrls is set or using service key)
-- bypasses these policies automatically.
