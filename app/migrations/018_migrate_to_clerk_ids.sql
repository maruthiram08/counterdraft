-- MIGRATION: 018_migrate_to_clerk_ids_v8_clean.sql
-- Only operates on tables with ACTUAL user_id columns (from FK query)
-- brain_trace_logs and content_references have policies but no user_id column

BEGIN;

-- ============================================
-- 1. DROP ALL POLICIES (All from pg_policies)
-- ============================================
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert logs for their content" on public.brain_trace_logs;
drop policy if exists "Users can view logs for their content" on public.brain_trace_logs;
drop policy if exists "connected_accounts_user_policy" on public.connected_accounts;
drop policy if exists "Users can delete their own references" on public.content_references;
drop policy if exists "Users can insert references for their own content" on public.content_references;
drop policy if exists "Users can update their own references" on public.content_references;
drop policy if exists "Users can view their own references" on public.content_references;
drop policy if exists "published_posts_user_policy" on public.published_posts;
drop policy if exists "Service Role manages all subscriptions" on public.subscriptions;
drop policy if exists "Users read own subscription" on public.subscriptions;
drop policy if exists "Anyone can insert feedback" on public.user_feedback;
drop policy if exists "Service role can read feedback" on public.user_feedback;


-- ============================================
-- 2. DROP FOREIGN KEYS (Only tables from FK query)
-- ============================================
alter table public.raw_posts drop constraint if exists raw_posts_user_id_fkey;
alter table public.beliefs drop constraint if exists beliefs_user_id_fkey;
alter table public.tensions drop constraint if exists tensions_user_id_fkey;
alter table public.idea_directions drop constraint if exists idea_directions_user_id_fkey;
alter table public.user_feedback drop constraint if exists user_feedback_user_id_fkey;
alter table public.drafts drop constraint if exists drafts_user_id_fkey;
alter table public.connected_accounts drop constraint if exists connected_accounts_user_id_fkey;
alter table public.published_posts drop constraint if exists published_posts_user_id_fkey;
alter table public.user_interests drop constraint if exists user_interests_user_id_fkey;
alter table public.content_items drop constraint if exists content_items_user_id_fkey;
alter table public.user_usage drop constraint if exists user_usage_user_id_fkey;
alter table public.thinking_artifacts drop constraint if exists thinking_artifacts_user_id_fkey;
alter table public.subscriptions drop constraint if exists subscriptions_user_id_fkey;
alter table public.users drop constraint if exists users_id_fkey;
alter table public.users drop constraint if exists users_clerk_id_fkey;


-- ============================================
-- 3. ALTER COLUMNS (Only tables with user_id)
-- ============================================
alter table public.users alter column id drop default;
alter table public.users alter column id type text using id::text;
alter table public.raw_posts alter column user_id type text using user_id::text;
alter table public.beliefs alter column user_id type text using user_id::text;
alter table public.tensions alter column user_id type text using user_id::text;
alter table public.idea_directions alter column user_id type text using user_id::text;
alter table public.user_feedback alter column user_id type text using user_id::text;
alter table public.drafts alter column user_id type text using user_id::text;
alter table public.connected_accounts alter column user_id type text using user_id::text;
alter table public.published_posts alter column user_id type text using user_id::text;
alter table public.user_interests alter column user_id type text using user_id::text;
alter table public.content_items alter column user_id type text using user_id::text;
alter table public.user_usage alter column user_id type text using user_id::text;
alter table public.thinking_artifacts alter column user_id type text using user_id::text;
alter table public.subscriptions alter column user_id type text using user_id::text;


-- ============================================
-- 4. RESTORE FOREIGN KEYS
-- ============================================
alter table public.raw_posts add constraint raw_posts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.beliefs add constraint beliefs_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.tensions add constraint tensions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.idea_directions add constraint idea_directions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.user_feedback add constraint user_feedback_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.drafts add constraint drafts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.connected_accounts add constraint connected_accounts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.published_posts add constraint published_posts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.user_interests add constraint user_interests_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.content_items add constraint content_items_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.user_usage add constraint user_usage_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.thinking_artifacts add constraint thinking_artifacts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.subscriptions add constraint subscriptions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;


-- ============================================
-- 5. RESTORE POLICIES
-- ============================================
-- Users
create policy "Users can read own profile" on public.users for select using (auth.uid()::text = id);
create policy "Users can update own profile" on public.users for update using (auth.uid()::text = id);

-- brain_trace_logs (policies use joins, not direct user_id)
-- These will need manual recreation if they break

-- connected_accounts
create policy "connected_accounts_user_policy" on public.connected_accounts for all using (auth.uid()::text = user_id);

-- content_references (policies use joins, not direct user_id)
-- These will need manual recreation if they break

-- published_posts
create policy "published_posts_user_policy" on public.published_posts for all using (auth.uid()::text = user_id);

-- subscriptions
create policy "Service Role manages all subscriptions" on public.subscriptions for all using (true);
create policy "Users read own subscription" on public.subscriptions for select using (auth.uid()::text = user_id);

-- user_feedback
create policy "Anyone can insert feedback" on public.user_feedback for insert with check (true);
create policy "Service role can read feedback" on public.user_feedback for select using (true);

COMMIT;
