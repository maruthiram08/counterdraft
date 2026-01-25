-- Create brain_trace_logs table
create table if not exists brain_trace_logs (
    id uuid default gen_random_uuid() primary key,
    content_item_id uuid references content_items(id) on delete set null,
    action text not null,
    input_context jsonb,
    output_result jsonb,
    tool_calls jsonb,
    model_config jsonb,
    latency_ms int,
    tokens_used int,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for brain_trace_logs
alter table brain_trace_logs enable row level security;

-- Only admins/service role can write logs typically, but for V1 we might allow authenticated users 
-- if we log from client side (less secure but easier). 
-- For now, we assume logging happens server-side with service role, 
-- but users should be able to VIEW their own logs if we want to show "why?".

create policy "Users can view logs for their content"
    on brain_trace_logs for select
    using ( auth.uid() in (
        select user_id from content_items where id = brain_trace_logs.content_item_id
    ));

-- Allow inserts if they own the content (in case client-side logging is needed later)
create policy "Users can insert logs for their content"
    on brain_trace_logs for insert
    with check ( auth.uid() in (
        select user_id from content_items where id = brain_trace_logs.content_item_id
    ));

-- Content Repurposing Support (Sprint 17-18)
alter table content_items
add column if not exists parent_id uuid references content_items(id) on delete set null,
add column if not exists platform_context text, -- 'medium', 'instagram', etc.
add column if not exists generated_assets jsonb; -- Stores paths/prompts for generated images
