-- Fix user_usage Foreign Key
-- It incorrectly references auth.users, but we use public.users (Clerk Sync).

-- 1. Drop the incorrect constraint
ALTER TABLE user_usage
DROP CONSTRAINT user_usage_user_id_fkey;

-- 2. Add the correct constraint
ALTER TABLE user_usage
ADD CONSTRAINT user_usage_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;
