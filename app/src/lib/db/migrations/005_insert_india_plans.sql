-- Migration: Insert India Plans into access_plans to satisfy Foreign Key constraints

-- We assume access_plans has at least: id, name, validity_days
-- If columns like 'price' or 'currency' exist, we might need to add them, but for now we target the known requirements.

INSERT INTO access_plans (id, display_name, validity_days, price_inr)
VALUES 
    ('prod_in_monthly', 'Pro Monthly (India)', 30, 999),
    ('prod_in_yearly', 'Pro Yearly (India)', 365, 9999)
ON CONFLICT (id) DO NOTHING;
