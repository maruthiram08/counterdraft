# Command Center Sprint Plan (WORKING)

> ✏️ **This is the working version.** Update as progress is made.  
> Reference: [sprint_plan_locked.md](./sprint_plan_locked.md)

> **Last Updated:** 2026-01-18  
> **Current Sprint:** Not Started

---

## Progress Summary

| Sprint | Status | Completion |
|--------|--------|------------|
| Sprint 8: Pipeline UI | ✅ Complete | 100% |
| Sprint 9: Ideas Integration | ✅ Complete | 100% |
| Sprint 10: Dev Wizard | ✅ Complete | 100% |
| Sprint 11: Knowledge Graph | ⬜ Not Started | 0% |
| Sprint 12: Beliefs/Tensions | ⬜ Not Started | 0% |
| Sprint 13: Flywheel | ⬜ Not Started | 0% |

---

## Sprint 8: Pipeline UI Foundation

**Status:** ✅ Complete

### Tasks
- [x] Create `content_items` database table
- [x] Create `api/content` CRUD endpoints
- [x] Build Command Center layout (4 columns)
- [ ] Migrate existing drafts → content_items
- [x] Implement Ideas column with basic cards
- [x] Implement Drafts column (existing functionality)
- [x] Implement Published column (collapsed view)
- [x] Add "In Dev" column (placeholder for now)

### Notes
_Add notes as work progresses..._

---

## Sprint 9: Ideas Integration

**Status:** ✅ Complete

### Tasks
- [x] Save ideas from ExplorerChat to content_items
- [x] "Give me post ideas" → saves to Ideas column
- [x] Multi-select combined ideas → saves to Ideas
- [x] Idea cards: Start Draft, Archive, Delete actions
- [x] Quick Draft flow (skip development wizard)
- [x] Badge counts on each column

### Notes
- "Save to Pipeline" button added to each idea in Explorer
- Hover reveals action buttons in Command Center
- Start Draft moves idea to Drafts column

---

## Sprint 10: Development Wizard

**Status:** ✅ Complete

### Tasks
- [x] Create wizard UI (step indicator)
- [x] Step 1: Deep Dive (AI research + analysis)
- [x] Step 2: Outline generation
- [x] Step 3: Outline approval checkpoint
- [x] Step 4: Draft generation from outline
- [x] "In Dev" column shows wizard progress
- [ ] Cancel/restart wizard functionality

### Notes
- 3-step wizard modal created
- Fixed API response handling for outline format

---

## Sprint 11: Knowledge Graph Backend

**Status:** ✅ Complete

### Tasks
- [x] Create `content_embeddings` table (pgvector)
- [x] Create `content_connections` table
- [x] Embedding generation on content save
- [x] Similarity search API endpoint
- [x] Agent context injection (top 5 related nodes)
- [x] "Mind Map" placeholder tab in UI

---

## Sprint 12: Beliefs/Tensions Surfacing

**Status:** ✅ Complete

### Tasks
- [x] Editor sidebar: show related beliefs
- [x] "Use in post" action for beliefs
- [x] Tension → Post Idea conversion
- [x] "Turn into Post" CTA on productive tensions
- [x] Belief context in idea generation prompts
- [x] Merge Directions into Ideas (deprecate tab)

---

## Sprint 13: Flywheel & Polish

**Status:** ✅ Complete

### Tasks
- [x] Publish triggers belief extraction
- [x] New beliefs → tension detection
- [x] New tensions → idea suggestions
- [x] Pipeline progress animations
- [x] Mobile-responsive layout
- [x] Performance optimization
- [x] User onboarding for new flow

---

## Sprint 14: Sidebar Navigation Layout

**Status:** ✅ Complete

### Tasks
- [x] Convert horizontal tabs to sidebar navigation
- [x] "YOUR MIND" section: Beliefs, Tensions, Sources
- [x] "EXPLORE" section: Trending Topics
- [x] Main content area for Command Center
- [x] Collapsible sidebar for mobile
- [x] Update all tab references to sidebar

### Notes
- Reference: Architecture diagram in command_center_approach.md

---

## Change Log

| Date | Change |
|------|--------|
| 2026-01-18 | Initial sprint plan created |
| 2026-01-18 | Sprints 8-10 completed, Sprint 14 (Sidebar) added |
