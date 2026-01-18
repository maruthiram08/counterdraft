# Counterdraft — Development Sprints

> **Goal**: Ship MVP to 5 power users within 6 weeks

---

## Sprint Overview

| Sprint | Duration | Focus | Deliverable |
|--------|----------|-------|-------------|
| **0** | 3 days | Project Setup | Repo, infra, auth |
| **1** | 1 week | Ingestion + Storage | Paste posts → store |
| **2** | 1 week | Belief Extraction | Core AI engine |
| **3** | 1 week | Tensions & Classification | Tension UX |
| **4** | 1 week | Idea Directions | Recommendation engine |
| **5** | 1 week | Polish & Beta | Bug fixes, 5 users |

---

## Sprint 0: Foundation (3 days)

### Goals
- [ ] Initialize Next.js 14 project with App Router
- [ ] Configure Tailwind CSS + design tokens
- [ ] Set up Supabase project (Postgres + Auth)
- [ ] Enable pgvector extension
- [ ] Set up Clerk OR Supabase Auth
- [ ] Configure environment variables
- [ ] Deploy to Vercel (empty shell)
- [ ] Create database schema (all tables)

### Deliverables
- Deployed skeleton at `counterdraft.vercel.app`
- Auth working (sign up / login)
- Database ready with all tables

---

## Sprint 1: Content Ingestion (1 week)

### Goals
- [ ] Build onboarding UI (paste posts flow)
- [ ] Create `/api/ingest` endpoint
- [ ] Implement text cleaning pipeline
  - Remove emojis, links, formatting
  - Split into individual posts
- [ ] Store raw posts in database
- [ ] Generate embeddings for each post (OpenAI or Claude)
- [ ] Handle inspiration posts (cold start flag)

### UX Flow
```
User lands → Sign up → "Paste your LinkedIn posts" 
  → Textarea → Submit → "Analyzing..." → Redirect to beliefs
```

### Deliverables
- User can paste 50+ posts
- Posts stored and embedded
- Loading state during processing

---

## Sprint 2: Belief Extraction Engine (1 week)

### Goals
- [ ] Build belief extraction prompt (Claude)
- [ ] Implement topic clustering (using embeddings)
- [ ] Extract 5-7 core beliefs per user
- [ ] Detect 3 overused angles
- [ ] Identify 1 emerging thesis
- [ ] Store beliefs with evidence links
- [ ] Build Belief Overview UI screen

### Claude Prompt (v1)
```
Given these posts from a creator, extract their underlying beliefs.

Requirements:
- 5-7 core beliefs (strongly held, repeatedly expressed)
- 3 overused angles (said too often, diminishing insight)
- 1 emerging thesis (new direction, low frequency)

Output as JSON. Be opinionated but concise.
```

### UI: Belief Overview
- Card per belief (editable)
- Belief type badge (core/overused/emerging)
- "Evidence" expandable (linked posts)
- Edit/confirm button per belief

### Deliverables
- Beliefs extracted and displayed
- User can confirm/edit beliefs
- Evidence linkage working

---

## Sprint 3: Tension Detection & Classification (1 week)

### Goals
- [ ] Build tension detection logic
  - Pairwise belief similarity
  - Claude evaluation for contradiction
- [ ] Create Tensions UI screen
- [ ] Implement classification UX
  - ❌ Inconsistency
  - ✅ Intentional Nuance
  - 🤔 Explore This
- [ ] Store user classifications
- [ ] Feed classifications into eval data

### UI: Tensions Screen
```
┌────────────────────────────────────────────┐
│  TENSION DETECTED                          │
│                                            │
│  "Move fast and break things"              │
│         vs                                 │
│  "Quality over speed always"               │
│                                            │
│  How do you hold these?                    │
│                                            │
│  [Inconsistency] [Nuance] [Explore]        │
└────────────────────────────────────────────┘
```

### Deliverables
- Tensions surfaced automatically
- User can classify each tension
- Classifications persisted

---

## Sprint 4: Idea Directions (1 week)

### Goals
- [ ] Build insight generation prompt
- [ ] Analyze belief coverage (saturated vs underexplored)
- [ ] Generate theme → topic recommendations
- [ ] Include:
  - Which belief it strengthens
  - What tension it explores
  - What it risks weakening
  - Opening line (optional)
- [ ] Build Idea Directions UI screen
- [ ] Implement dismiss/save actions

### UI: Idea Directions Screen
```
┌────────────────────────────────────────────┐
│  💡 IDEA DIRECTION                         │
│                                            │
│  Theme: Hiring Philosophy                  │
│  Topic: "Why I hire for attitude, not      │
│          skill"                            │
│                                            │
│  Strengthens: "Culture > credentials"      │
│  Explores: "Speed vs quality" tension      │
│  Risks: "Move fast" belief                 │
│                                            │
│  Opening: "Most founders get hiring        │
│           wrong..."                        │
│                                            │
│  [Explore This] [Dismiss]                  │
└────────────────────────────────────────────┘
```

### Deliverables
- 3 idea directions per user
- Clear belief/tension linkage
- Actions working (save/dismiss)

---

## Sprint 5: Polish & Beta (1 week)

### Goals
- [ ] Bug fixes from internal testing
- [ ] Loading states and error handling
- [ ] Empty states (no posts, no tensions)
- [ ] Mobile responsiveness pass
- [ ] Onboard 5 power users
- [ ] Collect qualitative feedback
- [ ] Set up basic analytics (Mixpanel/Posthog)

### Beta Criteria
- [ ] Complete flow works end-to-end
- [ ] < 30 second belief extraction
- [ ] No critical bugs
- [ ] 5 users complete onboarding

### Feedback Focus
- "Does this feel like your beliefs?"
- "Are tension classifications useful?"
- "Would you use idea directions?"

---

## Post-MVP (V1.5 Scope)

After validating with 5 users:

| Feature | Priority |
|---------|----------|
| Belief-anchored drafting | High |
| Belief history timeline | Medium |
| Re-analyze with new posts | High |
| Cross-platform adaptation | Low |
| User feedback loops (thumbs) | Medium |

---

## Success Definition

**MVP is successful if:**
1. 5 users complete full flow
2. 3+ users describe it as "editor for my thinking"
3. 2+ users add new posts for re-analysis
4. 0 users ask "where's the draft generator?"

---

## Risk Checkpoints

| Sprint | Risk Check |
|--------|------------|
| Sprint 2 | Are beliefs accurate? (Human eval) |
| Sprint 3 | Do tensions feel valuable? |
| Sprint 4 | Are idea directions non-obvious? |
| Sprint 5 | Would users pay for this? |

---

## Time Budget

| Sprint | Days | Cumulative |
|--------|------|------------|
| Sprint 0 | 3 | 3 |
| Sprint 1 | 5 | 8 |
| Sprint 2 | 5 | 13 |
| Sprint 3 | 5 | 18 |
| Sprint 4 | 5 | 23 |
| Sprint 5 | 5 | 28 |

**Total: ~6 weeks to beta-ready MVP**
