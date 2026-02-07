-- FIX: Decouple 'subscriptions' from Supabase Auth to support Clerk IDs
-- 1. Drop the Foreign Key constraint (since Clerk users aren't in auth.users)
alter table public.subscriptions drop constraint if exists subscriptions_user_id_fkey;

-- 2. Change user_id from UUID to TEXT (Clerk IDs are strings like 'user_2...')
alter table public.subscriptions alter column user_id type text using user_id::text;

-- 3. Update RLS (Optional: 'auth.uid()' won't work with Clerk unless custom JWT set up)
-- For now, we rely on Service Role API, so we can drop the user policy or leave it (it effectively blocks client reads, which is fine if we use API).
drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription" on public.subscriptions for select using (auth.uid()::text = user_id);
-- Note: The above policy only works if you pass Clerk JWT to Supabase. If not, client reads return empty.
-- Since we use /api/user/status (Service Role), this is safe.
