-- Columns the Razorpay flow writes. Older setups may be missing them, which made
-- provisioning fail after a successful charge. Safe to run more than once.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- The ops portal sets is_active when it creates a code
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
