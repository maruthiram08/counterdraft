-- MIGRATION: 018_migrate_to_clerk_ids_v4.sql
-- PURPOSE: Convert all User IDs to TEXT to support Clerk.
-- IMPACT: Breaks Supabase Auth dependency. Fixes 'published_posts', 'connected_accounts', and 'user_interests'.

BEGIN;

-- 1. DROP POLICIES (They lock columns)
-- Users
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
-- Drafts
drop policy if exists "Users can crud own drafts" on public.drafts;
-- Thinking Artifacts
drop policy if exists "Users can crud own artifacts" on public.thinking_artifacts;
-- Beliefs
drop policy if exists "Users can crud own beliefs" on public.beliefs;
drop policy if exists "Users can read own beliefs" on public.beliefs;
drop policy if exists "Users can insert own beliefs" on public.beliefs;
drop policy if exists "Users can update own beliefs" on public.beliefs;
-- Tensions
drop policy if exists "Users can crud own tensions" on public.tensions;
-- User Usage
drop policy if exists "Users read own usage" on public.user_usage;
-- Subscriptions
drop policy if exists "Users read own subscription" on public.subscriptions;
-- Connected Accounts
drop policy if exists "Users can crud own connected accounts" on public.connected_accounts;
drop policy if exists "connected_accounts_user_policy" on public.connected_accounts; 
-- Published Posts
drop policy if exists "published_posts_user_policy" on public.published_posts;
-- User Interests
drop policy if exists "Users can crud own interests" on public.user_interests;
drop policy if exists "Users can read own interests" on public.user_interests;
drop policy if exists "Users can update own interests" on public.user_interests;
drop policy if exists "Users can insert own interests" on public.user_interests;


-- 2. DROP FOREIGN KEYS (To unlock users.id)
-- Child Tables
alter table public.thinking_artifacts drop constraint if exists thinking_artifacts_user_id_fkey;
alter table public.drafts drop constraint if exists drafts_user_id_fkey;
alter table public.beliefs drop constraint if exists beliefs_user_id_fkey;
alter table public.tensions drop constraint if exists tensions_user_id_fkey;
alter table public.user_usage drop constraint if exists user_usage_user_id_fkey;
alter table public.subscriptions drop constraint if exists subscriptions_user_id_fkey;
alter table public.connected_accounts drop constraint if exists connected_accounts_user_id_fkey;
alter table public.published_posts drop constraint if exists published_posts_user_id_fkey;
alter table public.user_interests drop constraint if exists user_interests_user_id_fkey;

-- Users Table (Link to auth.users)
alter table public.users drop constraint if exists users_id_fkey;
alter table public.users drop constraint if exists users_clerk_id_fkey;


-- 3. ALTER COLUMNS TO TEXT
-- Users
alter table public.users alter column id drop default; -- Remove gen_random_uuid
alter table public.users alter column id type text using id::text;

-- Children
alter table public.thinking_artifacts alter column user_id type text using user_id::text;
alter table public.drafts alter column user_id type text using user_id::text;
alter table public.beliefs alter column user_id type text using user_id::text;
alter table public.tensions alter column user_id type text using user_id::text;
alter table public.user_usage alter column user_id type text using user_id::text;
alter table public.subscriptions alter column user_id type text using user_id::text;
alter table public.connected_accounts alter column user_id type text using user_id::text;
alter table public.published_posts alter column user_id type text using user_id::text;
alter table public.user_interests alter column user_id type text using user_id::text;


-- 4. RESTORE FOREIGN KEYS (Linking back to users.id TEXT)
alter table public.thinking_artifacts add constraint thinking_artifacts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.drafts add constraint drafts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.beliefs add constraint beliefs_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.tensions add constraint tensions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.user_usage add constraint user_usage_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.subscriptions add constraint subscriptions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.connected_accounts add constraint connected_accounts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.published_posts add constraint published_posts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.user_interests add constraint user_interests_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;


-- 5. RESTORE POLICIES (Using auth.uid()::text)

-- Users
create policy "Users can read own profile" on public.users for select using (auth.uid()::text = id);
create policy "Users can update own profile" on public.users for update using (auth.uid()::text = id);

-- Thinking Artifacts
create policy "Users can crud own artifacts" on public.thinking_artifacts for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Drafts
create policy "Users can crud own drafts" on public.drafts for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Beliefs
create policy "Users can crud own beliefs" on public.beliefs for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Tensions
create policy "Users can crud own tensions" on public.tensions for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- User Usage
create policy "Users read own usage" on public.user_usage for select using (auth.uid()::text = user_id);

-- Subscriptions
create policy "Users read own subscription" on public.subscriptions for select using (auth.uid()::text = user_id);

-- Connected Accounts
create policy "Users can crud own connected accounts" on public.connected_accounts for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Published Posts
create policy "published_posts_user_policy" on public.published_posts for all using (auth.uid()::text = user_id::text);

-- User Interests
create policy "Users can crud own interests" on public.user_interests for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

COMMIT;
