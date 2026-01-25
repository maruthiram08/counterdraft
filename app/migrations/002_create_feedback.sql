
-- Create feedback table
create table if not exists user_feedback (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  page_url text,
  user_id text, -- Clerk ID
  email text,   -- For anonymous users
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table user_feedback enable row level security;

-- Policy: Anyone can insert (public feedback)
create policy "Anyone can insert feedback"
  on user_feedback for insert
  with check (true);

-- Policy: Only service role (admin) can select/view
-- We don't want users reading other users' feedback
create policy "Service role can read feedback"
  on user_feedback for select
  using (auth.role() = 'service_role');
