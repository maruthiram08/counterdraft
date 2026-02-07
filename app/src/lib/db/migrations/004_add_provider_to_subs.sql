-- Migration: Add provider and subscription_id to subscriptions table for Razorpay support

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'stripe', -- 'stripe', 'dodo', 'razorpay'
ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Create index for faster lookups by subscription_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON subscriptions(subscription_id);
