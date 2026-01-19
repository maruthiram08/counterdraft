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

**Status:** ⬜ Not Started

### Tasks
- [ ] Create `content_embeddings` table (pgvector)
- [ ] Create `content_connections` table
- [ ] Embedding generation on content save
- [ ] Similarity search API endpoint
- [ ] Agent context injection (top 5 related nodes)
- [ ] "Mind Map" placeholder tab in UI

### Notes
_Add notes as work progresses..._

---

## Sprint 12: Beliefs/Tensions Surfacing

**Status:** ⬜ Not Started

### Tasks
- [ ] Editor sidebar: show related beliefs
- [ ] "Use in post" action for beliefs
- [ ] Tension → Post Idea conversion
- [ ] "Turn into Post" CTA on productive tensions
- [ ] Belief context in idea generation prompts
- [ ] Merge Directions into Ideas (deprecate tab)

### Notes
_Add notes as work progresses..._

---

## Sprint 13: Flywheel & Polish

**Status:** ⬜ Not Started

### Tasks
- [ ] Publish triggers belief extraction
- [ ] New beliefs → tension detection
- [ ] New tensions → idea suggestions
- [ ] Pipeline progress animations
- [ ] Mobile-responsive layout
- [ ] Performance optimization
- [ ] User onboarding for new flow

### Notes
_Add notes as work progresses..._

---

## Sprint 14: Sidebar Navigation Layout

**Status:** ⬜ Not Started

### Tasks
- [ ] Convert horizontal tabs to sidebar navigation
- [ ] "YOUR MIND" section: Beliefs, Tensions, Sources
- [ ] "EXPLORE" section: Trending Topics
- [ ] Main content area for Command Center
- [ ] Collapsible sidebar for mobile
- [ ] Update all tab references to sidebar

### Notes
- Reference: Architecture diagram in command_center_approach.md

---

## Change Log

| Date | Change |
|------|--------|
| 2026-01-18 | Initial sprint plan created |
| 2026-01-18 | Sprints 8-10 completed, Sprint 14 (Sidebar) added |
