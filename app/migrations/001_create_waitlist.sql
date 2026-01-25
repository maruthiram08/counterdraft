create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  source text default 'direct',
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table waitlist enable row level security;

-- Allow anyone to insert (public form)
create policy "Allow public inserts to waitlist"
  on waitlist for insert
  with check (true);

-- Only admins can view (service_role will bypass RLS anyway, but good to be explicit)
create policy "Only admins can view waitlist"
  on waitlist for select
  using (false); 
