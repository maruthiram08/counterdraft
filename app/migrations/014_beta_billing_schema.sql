-- 1. PLANS TABLE (SKU Catalog)
create table if not exists public.access_plans (
  id text primary key,
  display_name text not null,
  description text,
  price_inr integer not null, -- stored in paise (e.g., 99900 = ₹999.00)
  validity_days integer default 30,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- RLS: Only Service Role (or Admin if we add policy later) can write. Everyone can read active plans.
alter table public.access_plans enable row level security;
create policy "Public read access" on public.access_plans for select using (true);

-- 2. COUPONS TABLE (Magic Links)
create table if not exists public.coupons (
  code text primary key,
  plan_id text references public.access_plans(id),
  discount_percent integer default 0,
  max_redemptions integer default 1,
  redemptions_count integer default 0,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- RLS: Public can read (to validate), but sensitive fields should be careful.
-- Actually, for "Magic Links", we validte via API (Service Role) usually.
-- But let's allow read for now.
alter table public.coupons enable row level security;
create policy "Service Role manages coupons" on public.coupons using (true) with check (true);

-- 3. SUBSCRIPTIONS TABLE (User State)
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text references public.access_plans(id),
  status text check (status in ('active', 'past_due', 'cancelled', 'expired')),
  source text, -- 'razorpay', 'coupon', 'manual'
  coupon_code text references public.coupons(code),
  start_date timestamptz default now(),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Users can read their own.
alter table public.subscriptions enable row level security;
create policy "Users read own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- 4. SEED DATA (The Beta Plan)
insert into public.access_plans (id, display_name, description, price_inr, validity_days, limits)
values (
  'pro_beta_2026',
  'Pro (Beta)',
  'Exclusive Beta Access with full feature set.',
  99900, -- ₹999.00
  30,    -- 1 Month
  '{
    "monthly_articles": 50,
    "deep_dive_per_article": 2,
    "fact_checks_per_month": 100,
    "ai_images_per_month": 15,
    "thinking_mode_usage": 30,
    "daily_idea_generations": 10,
    "monthly_url_scrapes": 200
  }'::jsonb
)
on conflict (id) do update set
  limits = excluded.limits,
  price_inr = excluded.price_inr,
  validity_days = excluded.validity_days;
