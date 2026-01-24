
-- Feature Requests Table
create table if not exists feature_requests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  user_id text not null, -- Only logged in users can request
  status text default 'pending' check (status in ('pending', 'approved', 'in_progress', 'done')),
  upvotes int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Feature Votes Table (Tracks who voted on what)
create table if not exists feature_votes (
  user_id text not null,
  feature_id uuid references feature_requests(id) on delete cascade,
  vote_type int not null check (vote_type in (1, -1)), -- 1 for up, -1 for down
  primary key (user_id, feature_id)
);

-- Enable RLS
alter table feature_requests enable row level security;
alter table feature_votes enable row level security;

-- Policies for Requests
create policy "Anyone can read approved/in_progress/done requests"
  on feature_requests for select
  using (status in ('approved', 'in_progress', 'done') or auth.uid()::text = user_id);

create policy "Authenticated users can insert requests"
  on feature_requests for insert
  with check (auth.role() = 'authenticated');

-- Policies for Votes
create policy "Anyone can read votes"
  on feature_votes for select
  using (true);

create policy "Authenticated users can vote"
  on feature_votes for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own vote"
  on feature_votes for update
  using (auth.uid()::text = user_id);

create policy "Users can delete their own vote"
  on feature_votes for delete
  using (auth.uid()::text = user_id);
