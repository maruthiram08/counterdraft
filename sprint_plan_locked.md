# Command Center Sprint Plan (LOCKED)

> ⚠️ **AGENT INSTRUCTION: DO NOT MODIFY THIS FILE**  
> This is the locked reference version. Use `sprint_plan_working.md` for updates.

> **Version:** 1.0  
> **Created:** 2026-01-18  
> **Reference:** [command_center_approach.md](./command_center_approach.md)

---

## Sprint Overview

| Sprint | Focus | Duration |
|--------|-------|----------|
| **Sprint 8** | Pipeline UI Foundation | 3-4 days |
| **Sprint 9** | Ideas Integration | 2-3 days |
| **Sprint 10** | Development Wizard | 3-4 days |
| **Sprint 11** | Knowledge Graph Backend | 2-3 days |
| **Sprint 12** | Beliefs/Tensions Surfacing | 2-3 days |
| **Sprint 13** | Flywheel & Polish | 2-3 days |

---

## Sprint 8: Pipeline UI Foundation

**Goal:** Replace Posts sub-tabs with Command Center layout.

### Tasks
- [ ] Create `content_items` database table
- [ ] Create `api/content` CRUD endpoints
- [ ] Build Command Center layout (4 columns)
- [ ] Migrate existing drafts → content_items
- [ ] Implement Ideas column with basic cards
- [ ] Implement Drafts column (existing functionality)
- [ ] Implement Published column (collapsed view)
- [ ] Add "In Dev" column (placeholder for now)

### Deliverables
- New workspace layout with 4-column pipeline
- Data migration script for existing drafts

---

## Sprint 9: Ideas Integration

**Goal:** Connect Explore → Ideas and enable basic idea management.

### Tasks
- [ ] Save ideas from ExplorerChat to content_items
- [ ] "Give me post ideas" → saves to Ideas column
- [ ] Multi-select combined ideas → saves to Ideas
- [ ] Idea cards: Start Draft, Archive, Delete actions
- [ ] Quick Draft flow (skip development wizard)
- [ ] Badge counts on each column

### Deliverables
- Functional Ideas → Drafts flow
- Archive/Delete for Ideas and Drafts

---

## Sprint 10: Development Wizard

**Goal:** Build the guided development flow (Ideas → Draft).

### Tasks
- [ ] Create wizard UI (step indicator)
- [ ] Step 1: Deep Dive (AI research + analysis)
- [ ] Step 2: Outline generation
- [ ] Step 3: Outline approval checkpoint
- [ ] Step 4: Draft generation from outline
- [ ] "In Dev" column shows wizard progress
- [ ] Cancel/restart wizard functionality

### Deliverables
- Complete development wizard
- Outline approval flow

---

## Sprint 11: Knowledge Graph Backend

**Goal:** Build semantic connection layer for smarter AI.

### Tasks
- [ ] Create `content_embeddings` table (pgvector)
- [ ] Create `content_connections` table
- [ ] Embedding generation on content save
- [ ] Similarity search API endpoint
- [ ] Agent context injection (top 5 related nodes)
- [ ] "Mind Map" placeholder tab in UI

### Deliverables
- Embeddings infrastructure
- AI receives graph context for suggestions

---

## Sprint 12: Beliefs/Tensions Surfacing

**Goal:** Connect Beliefs and Tensions to content pipeline.

### Tasks
- [ ] Editor sidebar: show related beliefs
- [ ] "Use in post" action for beliefs
- [ ] Tension → Post Idea conversion
- [ ] "Turn into Post" CTA on productive tensions
- [ ] Belief context in idea generation prompts
- [ ] Merge Directions into Ideas (deprecate tab)

### Deliverables
- Beliefs visible during writing
- Tensions generate post ideas
- Directions tab removed

---

## Sprint 13: Flywheel & Polish

**Goal:** Complete the feedback loop and polish UX.

### Tasks
- [ ] Publish triggers belief extraction
- [ ] New beliefs → tension detection
- [ ] New tensions → idea suggestions
- [ ] Pipeline progress animations
- [ ] Mobile-responsive layout
- [ ] Performance optimization
- [ ] User onboarding for new flow

### Deliverables
- Complete content flywheel
- Production-ready Command Center

---

## Dependencies

```
Sprint 8 → Sprint 9 → Sprint 10
                ↓
           Sprint 11 → Sprint 12 → Sprint 13
```

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data migration failures | Test with subset first, keep rollback script |
| Wizard too slow | Pre-fetch research, show progress |
| Graph search latency | Use pgvector with proper indexing |
| User confusion on new UI | Gradual rollout, keep old flow accessible |
