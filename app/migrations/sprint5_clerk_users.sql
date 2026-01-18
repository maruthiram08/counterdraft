-- Sprint 5 Migration: Add clerk_id column to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
