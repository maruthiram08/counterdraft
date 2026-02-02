-- Create Thinking Artifacts Table
create table if not exists thinking_artifacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  
  -- Sourced From
  source_url text not null,
  source_title text,
  source_domain text,
  
  -- Content
  image_path text, -- Storage path
  ocr_text text,
  
  -- User Input
  user_note text,
  intent_type text check (intent_type in ('agree', 'counter', 'evidence', 'framing', 'example')),
  
  -- AI Enrichment
  ai_metadata jsonb default '{}'::jsonb,
  
  created_at timestamptz default now()
);

-- RLS for Artifacts
alter table thinking_artifacts enable row level security;

create policy "Users can crud own artifacts"
  on thinking_artifacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage Bucket for Lens
insert into storage.buckets (id, name, public)
values ('lens_captures', 'lens_captures', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Authenticated users can upload lens captures"
  on storage.objects for insert
  with check ( bucket_id = 'lens_captures' and auth.role() = 'authenticated' );

create policy "Users can read own lens captures"
  on storage.objects for select
  using ( bucket_id = 'lens_captures' and (auth.uid() = owner) );

create policy "Users can update own lens captures"
  on storage.objects for update
  using ( bucket_id = 'lens_captures' and (auth.uid() = owner) );
