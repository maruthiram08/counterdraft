
-- Sprint 29: Pro Plan Limits (Cost Control)

-- 1. Create table to track usage
create table if not exists user_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  draft_count int default 0,
  last_reset_date timestamptz default now(),
  plan_tier text default 'free', -- 'free', 'pro', 'enterprise'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Add RLS policies
alter table user_usage enable row level security;

-- Users can read their own usage
create policy "Users can read own usage"
  on user_usage for select
  using (auth.uid() = user_id);

-- Only Service Role can update usage (usually) to prevent tampering
-- But for simplicity in V1, we might allow the server (service role) to do it.
-- If we want client-side increments (risky), we'd add update policy.
-- Sticking to service-role only for updates is safer.

-- 3. Function to automatically create usage row on user signup (optional, or handle in code)
-- For now, we'll handle creation in the UsageService to be explicit.
