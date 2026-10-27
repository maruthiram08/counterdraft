-- Global (USD) Pro plans, charged through Razorpay international cards.
-- subscriptions.plan_id references access_plans, and the order API refuses to charge
-- for a plan that has no row here, so run this before Global checkout can work.
-- price_inr is not used for USD plans; prices live in app/src/lib/billing/plans.ts.

INSERT INTO access_plans (id, display_name, description, validity_days, price_inr)
VALUES
    ('prod_gl_monthly', 'Pro Monthly (Global)', 'USD 29 per month', 30, 0),
    ('prod_gl_yearly', 'Pro Yearly (Global)', 'USD 290 per year', 365, 0)
ON CONFLICT (id) DO NOTHING;
