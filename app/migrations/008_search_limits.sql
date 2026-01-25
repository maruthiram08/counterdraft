-- Migration: Add search_count to user_usage

-- 1. Add column
ALTER TABLE user_usage 
ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;

-- 2. Update existing rows (optional, default handles new ones)
UPDATE user_usage SET search_count = 0 WHERE search_count IS NULL;

-- 3. Update increment function (RPC) or create new one
CREATE OR REPLACE FUNCTION increment_search_count(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_usage (user_id, search_count)
  VALUES (user_id_param, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET search_count = user_usage.search_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
