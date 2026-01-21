-- Verify brain_metadata column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'content_items' 
  AND column_name IN ('brain_metadata', 'dev_step');
