-- Lens 1.0.3 replaces the "Framing" intent with "Style" (I like how this is written).
-- 'framing' stays allowed for captures saved before the change.
-- Until this runs, the app keeps a Style capture's intent in ai_metadata.intent and saves intent_type as null.
ALTER TABLE thinking_artifacts DROP CONSTRAINT IF EXISTS thinking_artifacts_intent_type_check;
ALTER TABLE thinking_artifacts ADD CONSTRAINT thinking_artifacts_intent_type_check
    CHECK (intent_type IN ('agree', 'counter', 'evidence', 'example', 'style', 'framing'));

-- Move intents parked in ai_metadata into the column
UPDATE thinking_artifacts
SET intent_type = ai_metadata->>'intent'
WHERE intent_type IS NULL AND ai_metadata->>'intent' = 'style';
