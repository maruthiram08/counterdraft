-- Counterdraft Database Schema
-- PostgreSQL with pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===========================================
-- USERS
-- ===========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ===========================================
-- RAW POSTS (Ingested content)
-- ===========================================
CREATE TABLE raw_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'linkedin',
  is_inspiration BOOLEAN DEFAULT FALSE,
  inspiration_author VARCHAR(255),
  posted_at TIMESTAMP WITH TIME ZONE,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_raw_posts_user_id ON raw_posts(user_id);
CREATE INDEX idx_raw_posts_embedding ON raw_posts USING ivfflat (embedding vector_cosine_ops);

-- ===========================================
-- BELIEFS
-- ===========================================
CREATE TABLE beliefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  belief_type VARCHAR(20) NOT NULL CHECK (belief_type IN (
    'core', 'overused', 'emerging', 'rejected'
  )),
  confidence FLOAT DEFAULT 0.0,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_confirmed BOOLEAN DEFAULT FALSE,
  user_edited BOOLEAN DEFAULT FALSE,
  original_statement TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_beliefs_user_id ON beliefs(user_id);
CREATE INDEX idx_beliefs_type ON beliefs(user_id, belief_type);
CREATE INDEX idx_beliefs_embedding ON beliefs USING ivfflat (embedding vector_cosine_ops);

-- ===========================================
-- BELIEF EVIDENCE (Links beliefs to posts)
-- ===========================================
CREATE TABLE belief_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  belief_id UUID NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES raw_posts(id) ON DELETE CASCADE,
  relevance_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(belief_id, post_id)
);

CREATE INDEX idx_belief_evidence_belief ON belief_evidence(belief_id);
CREATE INDEX idx_belief_evidence_post ON belief_evidence(post_id);

-- ===========================================
-- TENSIONS
-- ===========================================
CREATE TABLE tensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  belief_a_id UUID NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
  belief_b_id UUID NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
  tension_summary TEXT NOT NULL,
  user_classification VARCHAR(30) DEFAULT 'pending' CHECK (user_classification IN (
    'inconsistency', 'intentional_nuance', 'explore', 'pending'
  )),
  ai_confidence FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tensions_user_id ON tensions(user_id);
CREATE INDEX idx_tensions_classification ON tensions(user_id, user_classification);

-- ===========================================
-- IDEA DIRECTIONS
-- ===========================================
CREATE TABLE idea_directions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(255) NOT NULL,
  topic TEXT NOT NULL,
  strengthens_belief_id UUID REFERENCES beliefs(id) ON DELETE SET NULL,
  explores_tension_id UUID REFERENCES tensions(id) ON DELETE SET NULL,
  risks_weakening_belief_id UUID REFERENCES beliefs(id) ON DELETE SET NULL,
  opening_line TEXT,
  rationale TEXT,
  status VARCHAR(20) DEFAULT 'suggested' CHECK (status IN (
    'suggested', 'saved', 'dismissed', 'used'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_idea_directions_user_id ON idea_directions(user_id);
CREATE INDEX idx_idea_directions_status ON idea_directions(user_id, status);

-- ===========================================
-- USER FEEDBACK (For eval system)
-- ===========================================
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN (
    'belief', 'tension', 'idea_direction'
  )),
  entity_id UUID NOT NULL,
  feedback_type VARCHAR(30) NOT NULL CHECK (feedback_type IN (
    'accurate', 'inaccurate', 'helpful', 'not_helpful', 'edit', 'dismiss'
  )),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_entity ON user_feedback(entity_type, entity_id);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beliefs_updated_at
  BEFORE UPDATE ON beliefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tensions_updated_at
  BEFORE UPDATE ON tensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_idea_directions_updated_at
  BEFORE UPDATE ON idea_directions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
