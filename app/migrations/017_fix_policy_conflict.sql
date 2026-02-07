-- FIX: Drop conflicting policy first
drop policy if exists "Users read own subscription" on public.subscriptions;

-- 1. Remove the strict link to Supabase Auth
alter table public.subscriptions drop constraint if exists subscriptions_user_id_fkey;

-- 2. Allow Text IDs (for Clerk)
alter table public.subscriptions alter column user_id type text using user_id::text;

-- 3. Restore Policy (Casting auth.uid() to text to match)
create policy "Users read own subscription" 
on public.subscriptions 
for select 
using (auth.uid()::text = user_id);
