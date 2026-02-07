-- FIX: Allow Service Role to manage subscriptions
create policy "Service Role manages all subscriptions" 
on public.subscriptions 
using (true) 
with check (true);
