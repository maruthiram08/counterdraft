# Content Command Center: Unified Architecture

> ⚠️ **AGENT INSTRUCTION: DO NOT MODIFY THIS FILE**  
> This document is locked. Do not update, edit, or change any content unless the user **explicitly requests it**.  
> Treat this as a read-only reference document.

> **Version:** 1.0  
> **Date:** 2026-01-18  
> **Status:** Approved for Implementation

---

## Two User Personas, One System

| Persona | Goal | Entry Point |
|---------|------|-------------|
| **Thinkers** | Synthesize ideas, explore contradictions | Beliefs → Tensions → Ideas |
| **Creators** | Ship content fast | Explore → Ideas → Draft → Publish |

**The Sweet Spot:** Both workflows converge at the **Ideas** stage. The Command Center serves both.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           COUNTERDRAFT                                       │
├─────────────────────┬────────────────────────────────────────────────────────┤
│                     │                                                        │
│  🧠 YOUR MIND       │         💡 IDEAS  →  🔧 IN DEV  →  ✏️ DRAFTS  →  ✅ LIVE │
│  ─────────────      │         ────────────────────────────────────────────   │
│  Beliefs            │         ┌─────────────────────────────────────────┐    │
│  Tensions           │         │  Command Center (horizontal pipeline)  │    │
│  Sources            │         └─────────────────────────────────────────┘    │
│                     │                                                        │
│  🔍 EXPLORE         │                                                        │
│  ─────────────      │                                                        │
│  Trending Topics    │                                                        │
│                     │                                                        │
└─────────────────────┴────────────────────────────────────────────────────────┘
        Sidebar                            Main Content Area
```

---

## Module Connections

### Input → Ideas Flow

| Source | How It Feeds Ideas |
|--------|-------------------|
| **Explore** | User clicks "Give me post ideas" → saved to Ideas column |
| **Tensions** | Tensions marked "productive" → auto-suggested as post ideas |
| **Beliefs** | User clicks "Write about this" → creates idea with belief context |
| **Directions** | **(DEPRECATED)** — functionality merged into Ideas |

### Ideas → Development Flow

```
Idea → [Start Developing]
         ↓
    ┌─────────────────────────────────────────────┐
    │  DEVELOPMENT WIZARD (hidden stages)         │
    │  ─────────────────────────────────────────  │
    │  1. Deep Dive (Research + Analysis)         │
    │  2. Outline (USER APPROVAL CHECKPOINT)      │
    │  3. Generate Draft                          │
    └─────────────────────────────────────────────┘
         ↓
    Draft → Edit → Publish
```

**Escape hatch:** [Quick Draft] skips wizard, goes straight to editor.

### Published → Beliefs Feedback Loop (THE FLYWHEEL)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     THE CONTENT FLYWHEEL                             │
│  ────────────────────────────────────────────────────────────────    │
│                                                                      │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐                   │
│   │ BELIEFS │ ───→  │ TENSIONS│ ───→  │  IDEAS  │                   │
│   └────▲────┘       └─────────┘       └────┬────┘                   │
│        │                                   │                         │
│        │                                   ▼                         │
│        │                            ┌───────────┐                    │
│        │                            │  DEVELOP  │                    │
│        │                            └─────┬─────┘                    │
│        │                                  │                          │
│        │                                  ▼                          │
│   ┌────┴────┐                       ┌───────────┐                    │
│   │ EXTRACT │  ◀────────────────    │  PUBLISH  │                    │
│   └─────────┘                       └───────────┘                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**How it works:**
1. User publishes a post
2. System automatically **extracts beliefs** from the published content
3. New beliefs are compared against existing beliefs → **new tensions detected**
4. Tensions feed into **new post ideas**
5. Cycle continues → user's worldview evolves with each post

**Trigger:** On `status = 'published'`, run belief extraction pipeline asynchronously.

**Value:** The more you write, the sharper your thinking becomes. Your published work feeds your future ideas.

---

## Knowledge Graph: The Hidden Intelligence Layer

### Philosophy
> The user doesn't need to see the graph. They just need better ideas.

We build a **semantic knowledge graph** in the backend. The AI uses it to generate smarter suggestions. The user experiences magic without understanding the machinery.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE GRAPH (Backend)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    [Belief A] ──0.85──► [Belief B] ──0.72──► [Belief C]            │
│         │                   │                                       │
│        0.91               0.68                                      │
│         ▼                   ▼                                       │
│    [Post X]            [Tension Y]                                  │
│         │                                                           │
│        0.77                                                         │
│         ▼                                                           │
│   [External Topic: "AI Ethics"]                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Nodes:** Beliefs, Tensions, Posts, External Topics, Ideas
**Edges:** Semantic similarity scores (via embeddings)

### What the Agent Gets

When generating ideas, tensions, or suggestions, the AI receives:
- The target node (e.g., a new belief)
- Top 5 connected nodes with similarity scores
- Path connections (e.g., "Belief A → Post X → Topic Y")

**Result:** AI generates ideas that are **contextually aware** of the user's full intellectual history.

### Data Model Addition

```sql
-- Store embeddings for similarity search
CREATE TABLE content_embeddings (
    id UUID PRIMARY KEY,
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL, -- belief, tension, post, idea, topic
    embedding VECTOR(1536),     -- OpenAI embedding
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Store explicit connections (optional user-created backlinks)
CREATE TABLE content_connections (
    id UUID PRIMARY KEY,
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    connection_type TEXT, -- semantic, explicit, derived
    weight FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### MVP vs Future

| Aspect | MVP | Future |
|--------|-----|--------|
| **Backend** | Embeddings + similarity search | Full graph traversal |
| **Agent context** | Top 5 related nodes | Multi-hop reasoning |
| **UI** | Placeholder "Mind Map" tab | Interactive graph visualization |
| **User linking** | Hidden (AI-first) | Optional explicit backlinks |

### UI: Placeholder Tab (For Now)

```
┌─────────────────────────────────────────────────────────────────┐
│  🗺️ Mind Map                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│           🚧 COMING SOON 🚧                                     │
│                                                                 │
│   We're building a visual map of your thinking.                 │
│   In the meantime, the AI is already using                      │
│   connections behind the scenes to improve                      │
│   your suggestions.                                             │
│                                                                 │
│           [Explore Ideas Instead →]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Feature: Beliefs Surfacing During Writing

When user is editing a draft, the AI sidebar shows **contextual beliefs**:

```
┌─────────────────────────────────────────────────────────────────┐
│  EDITOR                          │  AI ASSISTANT               │
├──────────────────────────────────┼─────────────────────────────┤
│                                  │  💡 Relevant Beliefs:       │
│  "AI search is changing how     │  ─────────────────────────  │
│   we discover information..."    │  • "AI will replace         │
│                                  │    traditional search"      │
│                                  │  • "User intent matters     │
│                                  │    more than keywords"      │
│                                  │                             │
│                                  │  [Use in post] [Ignore]     │
│                                  │                             │
│                                  │  ⚡ Tension Alert:          │
│                                  │  You've said "AI is         │
│                                  │  overhyped" before.         │
│                                  │  [Address this?]            │
│                                  │                             │
└──────────────────────────────────┴─────────────────────────────┘
```

**Value:** User's writing becomes **consistent with their worldview** or **consciously contradicts it**.

---

## Key Feature: Tensions → Post Ideas

When a tension is classified as "productive":

```
┌─────────────────────────────────────────────────────────────┐
│  TENSION: Productive                                        │
│  ───────────────────────────────────────────────────────    │
│  "You believe AI will replace jobs"                         │
│          vs.                                                │
│  "You believe AI is overhyped"                              │
│  ───────────────────────────────────────────────────────    │
│  This tension could make a great post!                      │
│  [🚀 Turn into Post Idea]   [Dismiss]                       │
└─────────────────────────────────────────────────────────────┘
```

Clicking "Turn into Post Idea" creates:
```
{
  hook: "I believe two contradictory things about AI...",
  angle: "Exploring the nuance between optimism and skepticism",
  source: "tension:abc123"
}
```

---

## Command Center UI (4 Columns)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONTENT COMMAND CENTER                                      [+ New Idea]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │ 💡 IDEAS    │   │ 🔧 IN DEV   │   │ ✏️ DRAFTS   │   │ ✅ LIVE      │     │
│  │    (5)      │   │    (2)      │   │    (1)      │   │    (7)       │     │
│  ├─────────────┤   ├─────────────┤   ├─────────────┤   ├─────────────┤     │
│  │ ○ Hook 1    │   │ ○ Topic A   │   │ ○ Draft 1   │   │ (collapsed)  │     │
│  │   [Develop] │   │   [Pending] │   │   [Edit]    │   │ [View All]   │     │
│  │   [Archive] │   │             │   │   [Publish] │   │              │     │
│  │ ○ Hook 2    │   │ ○ Topic B   │   │             │   │              │     │
│  │   [Develop] │   │   [Outline] │   │             │   │              │     │
│  │ ○ Hook 3    │   │             │   │             │   │              │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Card Actions

| Stage | Actions |
|-------|---------|
| **Ideas** | Develop, Quick Draft, Archive, Delete |
| **In Dev** | View Progress, Approve Outline, Cancel |
| **Drafts** | Edit, Publish, Archive, Delete |
| **Live** | View, Open Link (no delete) |

---

## Data Model

### `content_items` (Unified Table)
```sql
CREATE TABLE content_items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    
    -- Content
    hook TEXT,
    angle TEXT,
    format TEXT,
    deep_dive JSONB,          -- Research + Analysis combined
    outline JSONB,
    draft_content TEXT,
    
    -- State
    stage TEXT DEFAULT 'idea', -- idea, developing, draft, published
    dev_step TEXT,             -- deep_dive, outline, generating (sub-stages)
    status TEXT DEFAULT 'active', -- active, archived
    
    -- Provenance
    source_type TEXT,          -- explore, tension, belief, manual
    source_id UUID,            -- Reference to source (tension_id, etc.)
    source_topics TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ,
    
    -- Publishing
    platform TEXT,
    platform_post_id TEXT
);
```

---

## Implementation Phases

### Phase 1: Pipeline UI (This Sprint)
- [ ] Create Command Center layout (4 columns)
- [ ] Migrate existing drafts → content_items
- [ ] Ideas → Quick Draft flow
- [ ] Archive/Delete functionality

### Phase 2: Smart Connections
- [ ] Explore → Ideas integration
- [ ] Tensions → Ideas surfacing
- [ ] Beliefs context in editor sidebar

### Phase 3: Development Wizard
- [ ] Deep Dive (AI research)
- [ ] Outline generation
- [ ] Approval checkpoint
- [ ] Draft generation from outline

### Phase 4: Deprecate Directions
- [ ] Hide Directions tab
- [ ] Migrate existing directions → Ideas
- [ ] Remove from navigation

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Ideas → Published conversion | >30% |
| Avg time from idea to publish | <1 hour |
| User retention (weekly active) | >60% |
| Tensions converted to posts | >20% |

---

## Summary

| What Changes | Before | After |
|--------------|--------|-------|
| Directions tab | Separate module | Merged into Ideas |
| Beliefs | Passive display | Surfaced during writing |
| Tensions | Just classified | Suggested as post ideas |
| Content flow | Tabs, context switching | Pipeline, visible progress |
| Development | Idea → chaos → Draft | Idea → Wizard → Draft |
