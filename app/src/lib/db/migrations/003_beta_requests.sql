create table if not exists beta_requests (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  linkedin_url text,
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Enable RLS (Service Role only for now, or public insert)
alter table beta_requests enable row level security;

-- Allow ANYONE to insert (Lead Gen)
create policy "Allow public inserts" on beta_requests for insert with check (true);

-- Allow admins to read (Service Role bypasses this, but good to have)
create policy "Allow admin read" on beta_requests for select using (false); 
