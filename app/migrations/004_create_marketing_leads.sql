
-- Marketing Leads Table (for Public Audit & other lead magnets)
create table if not exists marketing_leads (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  source text default 'unknown',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table marketing_leads enable row level security;

-- Policy: Public can insert (for lead capture forms)
-- Note: 'anon' (unauthenticated) users need insert access
create policy "Public can insert leads"
  on marketing_leads for insert
  with check (true);

-- Policy: Only service role can read
create policy "Service role can read leads"
  on marketing_leads for select
  using (auth.role() = 'service_role');
