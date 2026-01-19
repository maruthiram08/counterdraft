# LinkedIn Feature Implementation

> [!CAUTION]
> **DO NOT EDIT THIS DOCUMENT** until explicitly instructed by the project owner.
> This document captures architectural decisions made during brainstorming and serves as the source of truth.

---

## Document Info
- **Created**: 2026-01-18
- **Updated**: 2026-01-18 (Strategic Corrections Added)
- **Status**: Planning Complete
- **Branch**: `feature/linkedin-integration`

---

## Strategic Corrections (Board-Level Review)

> [!IMPORTANT]
> The following corrections were added after strategic review to avoid common architectural pitfalls.

### 1. Input Strategy: Soft Gate Required
**Original**: "Import all, filter later"
**Correction**: Introduce a **soft gate** between raw ingestion and belief extraction.

**Principle**: 
> What's worse in v1: missing one belief, or hallucinating one?
> **Answer: NO HALLUCINATIONS.**

**Implementation**:
- `raw_posts` — Everything ingested
- `belief_eligible_posts` — System-curated subset for extraction

This prevents noisy LinkedIn comments/shallow posts from polluting the belief graph.

### 2. Belief Confidence Model
Each belief must track:
- **Confidence score** — Frequency + source quality
- **Recency weighting** — Recent ≠ More important, but stale = less relevant
- **Stability flag** — Is this belief stable or exploratory?

Without this, false tensions will frustrate high-caliber thinkers.

### 3. Hard Invariant: Beliefs > Platforms
> **"Platforms adapt to beliefs — beliefs NEVER adapt to platforms."**

This is non-negotiable. If a platform requires belief compromise, the system must **warn the user**, not silently adjust.

### 4. LinkedIn = Optional Execution Layer
LinkedIn publishing is **not core infrastructure**. It is an optional execution layer.

**The test**: 
> "If publishing breaks tomorrow, do users still find value?"

If yes → correct architecture. If no → wrong priorities.

### 5. Explore ≠ Trending Feed
The Explore module must NOT become "what's hot". It must surface:
- Topics worth having an opinion on
- Not viral content

This requires **curation philosophy**, not just API integration.

---

## Execution Guidance (Critical)

> [!WARNING]
> This is where most teams accidentally violate their own philosophy. Read carefully.

### A. Soft Gate Must Be Conservative by Default

In Sprint 1, **bias the gate toward exclusion**, not inclusion.

**Practical heuristics**:
- ✅ Prefer longer posts over short ones
- ✅ Prefer original posts over reshares
- ✅ Prefer declarative language over questions
- ❌ Exclude comments entirely in v1

**If belief coverage feels thin** → That's acceptable. False confidence is not.

### B. Belief Confidence ≠ Math Problem

Do not over-engineer this.

**In v1**:
- Confidence = **ordinal** (low / medium / high)
- Stability = **binary** (stable / exploratory)

You are modeling **human judgment**, not statistics.

### C. Publishing Must Feel "Downstream"

When implementing LinkedIn publishing:
- ❌ Do NOT surface it prominently in navigation
- ❌ Do NOT frame it as the "next step"
- ❌ Do NOT nudge users toward posting

Publishing should feel like:
> *"When you're ready, this exists."*

That's how you preserve trust.

## Vision

Counterdraft = Central thinking hub where users:
1. **Aggregate** content from multiple sources (LinkedIn, Notion, Google Docs)
2. **Explore** trending topics to form new opinions
3. **Analyze** beliefs, tensions, patterns
4. **Adapt & Publish** to multiple platforms

---

## Platform Priorities

| Priority | Platform | Direction | Notes |
|----------|----------|-----------|-------|
| P1 | **LinkedIn** | Input + Output | First implementation |
| P2 | Notion | Input only | Fetch pages/databases |
| P3 | Google Docs | Input only | Fetch documents |

---

## Key Decisions Made

### Philosophy
- **Unified belief graph** — All sources feed into one belief analysis
- **Source tracking** — Know where each piece of evidence came from
- **Contradictions = Tensions** — Different views across platforms surface naturally
- **Platform-adapted output** — AI adjusts content format per destination
- **INVARIANT**: Platforms adapt to beliefs — beliefs NEVER adapt to platforms

### Input Strategy
- **Soft gate**: Import to `raw_posts`, but only `belief_eligible_posts` feed into extraction
- **No hallucinations**: Better to miss a belief than hallucinate one
- **Notion**: User explicitly shares pages/databases with integration
- **Deduplication**: At ingestion level for same content across platforms

### Output Strategy
- **Preview modal** before publish (with LinkedIn formatting limits)
- **No native markdown** in LinkedIn — Use Unicode characters + `\n` line breaks
- **Flexible multi-publish** — User decides if same draft goes to multiple platforms

### Data Model
- `status: 'published'` = Marked from our system (webhook verification future scope)
- **Track mapping**: Which draft → which published post(s)

### UX Decisions
- **Settings page** with dedicated Integrations section
- **Minimal UX**: We do heavy lifting, user just clicks to connect
- **Token expiration**: Silent refresh → Graceful disable → Non-intrusive reconnect prompt

### Exploration Module (Future)
- Separate **Explore tab** in workspace
- Trending sources: Google News, LinkedIn feed, flexible for growth
- Stance options: Write opinion, choose AI angles, debate prompts

---

## Database Schema

### `connected_accounts`
```sql
CREATE TABLE connected_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    platform TEXT NOT NULL,           -- 'linkedin', 'notion', 'google_docs'
    platform_user_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[],
    connected_at TIMESTAMPTZ DEFAULT now(),
    revoked BOOLEAN DEFAULT false
);
```

### `published_posts`
```sql
CREATE TABLE published_posts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    draft_id UUID REFERENCES drafts(id),
    platform TEXT NOT NULL,
    platform_post_id TEXT,
    adapted_content TEXT,
    published_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Workspace Tabs (Updated)

| Tab | Purpose | Status |
|-----|---------|--------|
| Beliefs | Review extracted beliefs | Existing |
| Tensions | Classify contradictions | Existing |
| **Explore** | Discover trending topics | New (Phase 5) |
| Directions | AI-generated writing ideas | Existing |
| Drafts | Edit + Publish | Existing (adding publish) |

---

## Implementation Phases

### Phase 1: Foundation
- [ ] `connected_accounts` migration
- [ ] `published_posts` migration
- [ ] Settings page with Integrations section
- [ ] Platform adapter interface

### Phase 2: LinkedIn (Priority 1)
- [ ] LinkedIn OAuth (connect/disconnect)
- [ ] Fetch past LinkedIn posts → `raw_posts`
- [ ] Publish draft → LinkedIn
- [ ] Preview modal with formatting

### Phase 3: Notion (Priority 2)
- [ ] Notion OAuth flow
- [ ] Fetch shared pages/databases
- [ ] Feed into belief extraction

### Phase 4: Google Docs (Priority 3)
- [ ] Google OAuth flow
- [ ] Fetch documents
- [ ] Feed into belief extraction

### Phase 5: Exploration Module
- [ ] Add Explore tab to workspace
- [ ] Trending topics integration
- [ ] Stance → Belief conversion flow

---

## Technical Research Findings

### LinkedIn API
- **No native markdown** — Use Unicode formatting (𝗕𝗼𝗹𝗱, 𝘐𝘵𝘢𝘭𝘪𝘤)
- **Line breaks**: Use `\n` characters
- **Limitations**: Unicode text not searchable, may display inconsistently
- **Scopes needed**: `r_liteprofile`, `r_member_social`, `w_member_social`
- **Approval required**: LinkedIn Marketing Developer Platform review

### Notion API
- **OAuth 2.0** (Public Integration)
- **Pages**: `Retrieve a page` + `Retrieve block children`
- **Databases**: `Query a database`
- **Key constraint**: User must explicitly share pages/databases

### Google Docs API
- OAuth 2.0 with Drive scope
- Research needed before implementation

---

## Questions Answered During Brainstorming

| Question | Decision |
|----------|----------|
| Import strategy | Import all, filter later |
| Notion structure | User defines what to share |
| LinkedIn preview | Yes, show preview |
| Multi-platform publish | User's choice, flexible |
| Published status meaning | From our system, webhook later |
| Draft→Post tracking | Yes, track mapping |
| Settings location | Dedicated Settings page |
| Token expiration | Silent refresh → Disable → Prompt |
| Trending sources | Google News, LinkedIn, flexible |
| Explore tab | Yes, separate workspace tab |

---

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| This document | `/counterdraft/LinkedIn feature implementation.md` | Source of truth |
| Implementation Plan | `brain/.../linkedin_implementation_plan.md` | Detailed plan |
| Discovery Notes | `brain/.../linkedin_discovery.md` | Research notes |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-18 | Initial document created |
| 2026-01-18 | Strategic corrections added (soft gate, confidence model, hard invariants) |
| 2026-01-18 | Sprint breakdown added (9 sprints with detailed tasks) |
| 2026-01-18 | Execution guidance added (conservative gate, ordinal confidence, downstream publishing) |

---

> **Next Step**: Begin Phase 1 — Foundation (schema + settings page)
