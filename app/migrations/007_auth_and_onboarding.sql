
-- Sprint 30: Authentication & Onboarding

-- 1. Ensure 'users' table has profile fields (assuming it exists from user-sync, but let's be safe)
-- If we were using a separate 'users' table in public schema:
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Add Onboarding Fields
alter table users 
add column if not exists onboarding_completed boolean default false,
add column if not exists role text, -- e.g. 'Founder', 'Creator'
add column if not exists context text, -- 'Building a SaaS for...'
add column if not exists voice_tone text; -- 'Contrarian', 'Academic'

-- 3. RLS
alter table users enable row level security;

create policy "Users can read own profile"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid() = id);

-- Service role can do everything (for webhooks)
