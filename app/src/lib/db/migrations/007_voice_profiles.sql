-- Create voice_profiles table
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT 'Default Voice',
  
  -- Analysis Data (The "Fingerprint")
  analysis_json JSONB DEFAULT '{}'::jsonb,
  
  -- Editable Guide (The "Rules")
  voice_tone TEXT, -- e.g. "Direct, Contrarian"
  rules TEXT[] DEFAULT '{}', -- Explicit dos
  anti_patterns TEXT[] DEFAULT '{}', -- Explicit don'ts
  
  -- Implementation Preferences (The "Workflow")
  workflow_preferences JSONB DEFAULT '{
    "auto_ask_questions": false,
    "interaction_model": "ghostwriter"
  }'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON voice_profiles(user_id);

-- Add RLS Policies
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice profiles"
  ON voice_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice profiles"
  ON voice_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice profiles"
  ON voice_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice profiles"
  ON voice_profiles FOR DELETE
  USING (auth.uid() = user_id);
