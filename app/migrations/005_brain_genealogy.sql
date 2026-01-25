
-- Upgrade Beliefs table for Genealogy Tree (Sprint Brain V1)

-- 1. Add hierarchy columns
alter table beliefs 
add column if not exists parent_id uuid references beliefs(id),
add column if not exists belief_type text default 'leaf' check (belief_type in ('root', 'pillar', 'leaf')),
add column if not exists root_id uuid references beliefs(id); -- Optimization to find top-level quickly

-- 2. Add index for tree traversals
create index if not exists idx_beliefs_parent_id on beliefs(parent_id);
create index if not exists idx_beliefs_root_id on beliefs(root_id);
create index if not exists idx_beliefs_type on beliefs(belief_type);

-- 3. Add 'tags' array for loose grouping if not exists
alter table beliefs 
add column if not exists tags text[] default '{}';

-- 4. RLS Policy updates (if needed, usually covers all columns automatically)
-- Ensuring recursive queries work well for the service role
