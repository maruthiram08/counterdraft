-- Migration: Support Multiple Voice Profiles
-- Author: Antigravity
-- Date: 2026-02-07

-- Fix for "foreign key constraint ... incompatible types: uuid and text"
-- The users table in this environment uses TEXT for IDs, not UUID.

-- 1. Create the table with user_id as TEXT (compatible with referenced users.id)
CREATE TABLE IF NOT EXISTS voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- CHANGED FROM UUID TO TEXT
    name VARCHAR(100) DEFAULT 'Default Voice',
    voice_tone TEXT,
    rules TEXT[] DEFAULT '{}',
    anti_patterns TEXT[] DEFAULT '{}',
    workflow_preferences JSONB DEFAULT '{"auto_ask_questions": false, "interaction_model": "ghostwriter"}',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure 'name' column exists (safe-guard)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voice_profiles' AND column_name = 'name') THEN 
        ALTER TABLE voice_profiles ADD COLUMN name VARCHAR(100) DEFAULT 'Default Voice';
    END IF;
END $$;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_active ON voice_profiles(user_id, is_active);

-- 4. Enable RLS
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (casting auth.uid() to text if needed, though Postgres usually handles equality comparison)
-- Note: auth.uid() returns uuid. If user_id is text, we might need to cast.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can view their own profiles') THEN
        CREATE POLICY "Users can view their own profiles" ON voice_profiles
            FOR SELECT USING (auth.uid()::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can insert their own profiles') THEN
        CREATE POLICY "Users can insert their own profiles" ON voice_profiles
            FOR INSERT WITH CHECK (auth.uid()::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can update their own profiles') THEN
        CREATE POLICY "Users can update their own profiles" ON voice_profiles
            FOR UPDATE USING (auth.uid()::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can delete their own profiles') THEN
        CREATE POLICY "Users can delete their own profiles" ON voice_profiles
            FOR DELETE USING (auth.uid()::text = user_id);
    END IF;
END $$;
