# Backlog

## Pending Actions (Before Merge)

### Sprint 1: Database Migration
> [!IMPORTANT]
> Run this migration in Supabase before merging to main.

**File**: `app/migrations/sprint10_multi_platform.sql`

**Tables Created**:
- `connected_accounts` — OAuth tokens for LinkedIn, Notion, Google Docs
- `published_posts` — Draft → platform post mapping

**Columns Added**:
- `raw_posts.is_belief_eligible` — Soft gate for belief extraction
- `raw_posts.platform_post_id` — Platform's post identifier
- `beliefs.confidence_level` — Ordinal: low/medium/high
- `beliefs.recency_weight` — Float 0-1
- `beliefs.is_stable` — Boolean
- `beliefs.evidence_count` — Integer
- `drafts.linkedin_post_urn` — LinkedIn post URN
- `drafts.published_at` — Timestamp

**RLS Policies**:
- `connected_accounts_user_policy`
- `published_posts_user_policy`

---

## Future Sprints (Deferred)

- Sprint 7: Notion Integration
- Sprint 8: Google Docs Integration
- Sprint 9: Exploration Module

---

## Technical Debt
- [ ] Tiptap Rich Text Editor
- [ ] Engagement metrics tracking
- [ ] Twitter integration
