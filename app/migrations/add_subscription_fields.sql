-- Add subscription tracking columns to the users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive', -- active, inactive, past_due
ADD COLUMN IF NOT EXISTS subscription_plan TEXT, -- pro_monthly, pro_yearly
ADD COLUMN IF NOT EXISTS subscription_id TEXT; -- razorpay_order_id or sub_id

-- Optional: Create an index for faster lookups if querying by subscription
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
