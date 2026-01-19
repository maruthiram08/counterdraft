# Counterdraft — Technical Architecture

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  (Next.js — Responsive: Mobile Bottom Sheet + Desktop Sidebar)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│                     (Next.js API Routes)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   INGESTION      │ │  BELIEF ENGINE   │ │ INSIGHT ENGINE   │
│   SERVICE        │ │  (Core AI)       │ │ (Recommendations)│
└──────────────────┘ └──────────────────┘ └──────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BELIEF GRAPH STORE                            │
│                  (PostgreSQL + pgvector)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       LLM LAYER                                  │
│                    (Claude API)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Deep Dive

### 2.1 Ingestion Service

**Responsibility**: Accept raw content, clean it, prepare for analysis

**Input Sources (V1)**
- Manual text paste (LinkedIn posts)
- Inspiration posts (for cold start)

**Processing Pipeline**
```
Raw Text
  → Clean (remove emojis, links, formatting artifacts)
  → Segment (split into individual posts)
  → Time-order (if dates available)
  → Generate embeddings (for semantic clustering)
  → Store in staging table
```

**Schema: Raw Posts Table**
```sql
CREATE TABLE raw_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  source TEXT DEFAULT 'linkedin',
  is_inspiration BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2.2 Belief Engine (Core AI)

**Responsibility**: Extract structured beliefs from raw content

**Sub-modules**

| Module | Function |
|--------|----------|
| Topic Clusterer | Group posts by semantic similarity |
| Opinion Extractor | Identify opinionated statements |
| Repetition Detector | Flag overused patterns |
| Contradiction Detector | Surface potential tensions |
| Belief Summarizer | Distill clusters into belief statements |

**Claude Prompt Strategy**

```
System: You are an intellectual analyst. Given a creator's posts,
extract their underlying beliefs. Be opinionated but concise.

Focus on:
- What do they believe strongly? (core beliefs)
- What have they said too often? (overused)
- Where do they contradict themselves? (tensions)
- What new direction are they moving toward? (emerging)

Output as structured JSON.
```

**Schema: Beliefs Table**
```sql
CREATE TABLE beliefs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  statement TEXT NOT NULL,
  belief_type TEXT CHECK (belief_type IN (
    'core', 'rejected', 'overused', 'emerging'
  )),
  confidence FLOAT DEFAULT 0.0,
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE belief_evidence (
  id UUID PRIMARY KEY,
  belief_id UUID REFERENCES beliefs(id),
  post_id UUID REFERENCES raw_posts(id),
  relevance_score FLOAT
);
```

---

### 2.3 Tension Detection Module

**Logic**
1. Compute pairwise semantic similarity between beliefs
2. Use Claude to evaluate if high-similarity pairs are contradictory
3. Surface for user classification

**Schema: Tensions Table**
```sql
CREATE TABLE tensions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  belief_a_id UUID REFERENCES beliefs(id),
  belief_b_id UUID REFERENCES beliefs(id),
  tension_summary TEXT,
  user_classification TEXT CHECK (user_classification IN (
    'inconsistency', 'intentional_nuance', 'explore', 'pending'
  )),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2.4 Insight Engine

**Responsibility**: Generate idea directions based on belief graph

**Logic**
1. Analyze belief coverage (which themes are saturated vs underexplored)
2. Identify high-potential tensions (classified as "explore")
3. Suggest themes → topics that would strengthen/evolve beliefs

**Output Schema**
```json
{
  "idea_directions": [
    {
      "theme": "Hiring Philosophy",
      "topic": "Why I hire for attitude, not skill",
      "strengthens_belief": "belief_id_123",
      "explores_tension": "tension_id_456",
      "risks_weakening": "belief_id_789",
      "opening_line": "Most founders get hiring wrong..."
    }
  ]
}
```

**Schema: Idea Directions Table**
```sql
CREATE TABLE idea_directions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  theme TEXT,
  topic TEXT,
  strengthens_belief_id UUID REFERENCES beliefs(id),
  explores_tension_id UUID REFERENCES tensions(id),
  risks_weakening_belief_id UUID REFERENCES beliefs(id),
  opening_line TEXT,
  status TEXT DEFAULT 'suggested',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2.5 Belief Graph Store

**Technology**: PostgreSQL with pgvector extension

**Why Postgres + pgvector?**
- Familiar, reliable, battle-tested
- pgvector for semantic search (belief similarity)
- Supabase provides managed hosting + auth

**Core Tables Summary**
```
users
  └── raw_posts
  └── beliefs
        └── belief_evidence (links to posts)
  └── tensions (links two beliefs)
  └── idea_directions
```

---

## 3. API Layer

**Framework**: Next.js API Routes

**Core Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest` | POST | Submit raw posts for analysis |
| `/api/beliefs` | GET | Fetch user's belief graph |
| `/api/beliefs/:id` | PATCH | User edits a belief |
| `/api/tensions` | GET | Fetch detected tensions |
| `/api/tensions/:id/classify` | POST | User classifies a tension |
| `/api/ideas` | GET | Fetch idea directions |
| `/api/ideas/:id/dismiss` | POST | User dismisses an idea |

---

## 4. UI Layer

**Framework**: Next.js + React

**Core Screens**

| Screen | Purpose |
|--------|---------|
| **Onboarding** | Paste posts OR inspiration content |
| **Belief Overview** | View/edit core beliefs |
| **Tensions** | Surface & classify contradictions |
| **Idea Directions** | Explore what to write next |
| **Belief History** | Read-only timeline of belief evolution |

**UX Constraints**
- Minimal controls
- No infinite feeds or social signals
- Editorial, calm, private aesthetic
- **Mobile Support**: Full responsiveness via Bottom Sheet + swipe tabs

### Mobile Strategy
- **Navigation**: `MobileBottomNav` (4 tabs) replaces Sidebar on <768px.
- **AI Interaction**: "Bottom Sheet" pattern (`MobileAgentSheet`) for non-blocking assistance.
- **Command Center**: Stacks vertically with horizontal scroll tabs for stages.


---

## 5. AI Integration (Claude)

**Model**: Claude 3.5 Sonnet (balance of speed + reasoning)

**Use Cases**

| Task | Prompt Strategy |
|------|-----------------|
| Belief Extraction | Structured JSON output, few-shot examples |
| Tension Detection | Yes/No classification + explanation |
| Idea Generation | Chain of thought → theme → topic |
| Opening Lines | Constrained to one line, style-matched |

**Cost Considerations**
- Initial analysis: ~10k tokens input per user
- Ongoing queries: ~1k tokens per session
- Budget: ~$0.10-0.20 per user per month (at scale)

---

## 6. Eval System

**Phase 1: Human Eval (Beta)**
- Internal team reviews belief extractions
- Track accuracy: did we capture real beliefs?
- Track false positives: did we invent beliefs?

**Phase 2: AI Eval**
- Use Claude to evaluate its own outputs
- Compare against human-labeled ground truth
- Automated regression testing on prompt changes

**Phase 3: User Feedback Loops**
- Thumbs up/down on beliefs
- Tension classification signals
- Idea dismissal signals
- Feed into model fine-tuning (future)

---

## 7. The Brain (Decision Engine) [NEW]

**Role**: Deterministic decision system. Runs *before* AI generation.

**Core Logic**:
1. **Outcome Spine**: Every post optimizes for one of: Authority, Engagement, Conversion, Connection.
2. **Deferred Input**: Detect missing context first, ask later. Never block user.
3. **Confidence Model**: Scores readiness based on known inputs (Audience, Outcome, Stance).

**UI Components**:
- Outcome Picker (Inline)
- Audience Mini-Card
- Stance Toggle
- Confidence Indicator (Visual ring)

---

## 8. Security & Privacy

- **Auth**: Clerk or Supabase Auth
- **Data**: Per-user isolated, no cross-user access
- **Private by default**: No public profiles
- **Encryption**: At rest (Postgres) + in transit (HTTPS)
- **GDPR**: Export/delete user data on request

---

## 8. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Supabase) + pgvector |
| AI | Claude 3.5 Sonnet (Anthropic API) |
| Auth | Clerk or Supabase Auth |
| Hosting | Vercel (frontend + API) |
| File Storage | Supabase Storage (if needed) |

---

## 9. Infrastructure Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │────▶│   Supabase   │────▶│   Claude     │
│  (Next.js)   │     │  (Postgres)  │     │   (API)      │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│    Clerk     │     │   pgvector   │
│   (Auth)     │     │ (Embeddings) │
└──────────────┘     └──────────────┘
```

---

## 10. Out of Scope (V1)

- Native iOS/Android app (PWA for now)
- Browser extension
- Public sharing
- Team collaboration
- Real-time sync
- Multi-platform ingestion
