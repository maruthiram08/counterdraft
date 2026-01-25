-- Create content_references table
create table if not exists content_references (
  id uuid default gen_random_uuid() primary key,
  content_item_id uuid references content_items(id) on delete cascade not null,
  reference_type text not null check (reference_type in ('text', 'link', 'file')),
  title text not null,
  content text, -- For raw text or link description
  url text, -- For links or file public URLs
  file_path text, -- Internal storage path for files
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for content_references
alter table content_references enable row level security;

create policy "Users can view their own references"
  on content_references for select
  using ( auth.uid() in (
    select user_id from content_items where id = content_references.content_item_id
  ));

create policy "Users can insert references for their own content"
  on content_references for insert
  with check ( auth.uid() in (
    select user_id from content_items where id = content_references.content_item_id
  ));

create policy "Users can update their own references"
  on content_references for update
  using ( auth.uid() in (
    select user_id from content_items where id = content_references.content_item_id
  ));

create policy "Users can delete their own references"
  on content_references for delete
  using ( auth.uid() in (
    select user_id from content_items where id = content_references.content_item_id
  ));

-- Create references storage bucket
insert into storage.buckets (id, name, public)
values ('references', 'references', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "References are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'references' );

create policy "Users can upload references"
  on storage.objects for insert
  with check ( bucket_id = 'references' and auth.role() = 'authenticated' );

create policy "Users can update their own references"
  on storage.objects for update
  using ( bucket_id = 'references' and auth.uid() = owner );

create policy "Users can delete their own references"
  on storage.objects for delete
  using ( bucket_id = 'references' and auth.uid() = owner );
