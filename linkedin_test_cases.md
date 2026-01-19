# LinkedIn Integration — Manual Test Cases

## Prerequisites
- [ ] Migration `sprint10_multi_platform.sql` run in Supabase
- [ ] `.env.local` contains: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`
- [ ] LinkedIn Developer App configured with redirect URI
- [ ] Dev server running (`npm run dev`)

---

## Sprint 1: Database Foundation

### TC-1.1: connected_accounts table exists
1. Open Supabase Dashboard → Table Editor
2. Verify `connected_accounts` table exists
3. **Expected**: Table with columns: id, user_id, platform, platform_user_id, access_token, refresh_token, token_expires_at, scopes, profile_name, profile_picture, connected_at, revoked

### TC-1.2: published_posts table exists
1. Open Supabase Dashboard → Table Editor
2. Verify `published_posts` table exists
3. **Expected**: Table with columns: id, user_id, draft_id, platform, platform_post_id, adapted_content, published_at

### TC-1.3: raw_posts has new columns
1. Check `raw_posts` table structure
2. **Expected**: `is_belief_eligible` (boolean), `platform_post_id` (varchar) columns exist

### TC-1.4: beliefs has confidence columns
1. Check `beliefs` table structure
2. **Expected**: `confidence_level`, `recency_weight`, `is_stable`, `evidence_count` columns exist

### TC-1.5: RLS policies active
1. Attempt to query `connected_accounts` without auth
2. **Expected**: Access denied / empty results

---

## Sprint 2: Settings & Integrations UI

### TC-2.1: Settings page loads
1. Sign in to the app
2. Click "Settings" in header navigation
3. **Expected**: `/settings` page loads with "Integrations" section

### TC-2.2: Settings link in header
1. Sign in to the app
2. Verify "Settings" link appears in header (next to Workspace)
3. **Expected**: Link visible and clickable

### TC-2.3: LinkedIn shows as available
1. Navigate to `/settings`
2. Find LinkedIn integration card
3. **Expected**: LinkedIn shows with "Connect" button (not "Coming Soon")

### TC-2.4: Notion shows as coming soon
1. Navigate to `/settings`
2. Find Notion integration card
3. **Expected**: Shows "Coming Soon" badge, button disabled

### TC-2.5: Google Docs shows as coming soon
1. Navigate to `/settings`
2. Find Google Docs integration card
3. **Expected**: Shows "Coming Soon" badge, button disabled

---

## Sprint 3: LinkedIn OAuth Flow

### TC-3.1: Connect button initiates OAuth
1. Navigate to `/settings`
2. Click "Connect" on LinkedIn card
3. **Expected**: Redirected to LinkedIn authorization page

### TC-3.2: OAuth callback stores tokens
1. Complete LinkedIn OAuth authorization
2. Check `connected_accounts` table in Supabase
3. **Expected**: New row with platform='linkedin', access_token present

### TC-3.3: Connected status displayed
1. After successful OAuth, return to `/settings`
2. Find LinkedIn card
3. **Expected**: Shows "Connected" badge, profile name, connected date

### TC-3.4: Disconnect revokes connection
1. On connected LinkedIn card, click "Disconnect"
2. Check `connected_accounts` table
3. **Expected**: Row has `revoked=true`, access_token cleared

### TC-3.5: Reconnect after disconnect
1. After disconnect, click "Connect" again
2. Complete OAuth
3. **Expected**: New tokens stored, shows connected again

### TC-3.6: Invalid state rejected
1. Manually navigate to `/api/linkedin/callback?code=test&state=invalid`
2. **Expected**: Redirected to `/settings?error=invalid_state`

### TC-3.7: Expired state rejected
1. Wait >10 minutes after initiating OAuth
2. Complete the authorization
3. **Expected**: Redirected to `/settings?error=state_expired`

---

## Sprint 4: Fetch LinkedIn Posts

### TC-4.1: Sync Posts button appears
1. Connect LinkedIn account
2. Navigate to `/settings`
3. **Expected**: "Sync Posts" button visible on LinkedIn card

### TC-4.2: Sync fetches posts
1. Click "Sync Posts" button
2. Wait for completion
3. **Expected**: Shows "X posts synced · Y eligible for beliefs"

### TC-4.3: Posts stored in raw_posts
1. After sync, check `raw_posts` table
2. Filter by `source='linkedin'`
3. **Expected**: Posts from LinkedIn present with `platform_post_id`

### TC-4.4: Eligibility filter - short posts excluded
1. Post a short (<100 chars) post on LinkedIn
2. Sync posts
3. **Expected**: Short post has `is_belief_eligible=false`

### TC-4.5: Eligibility filter - reshares excluded
1. Reshare someone's post on LinkedIn
2. Sync posts
3. **Expected**: Reshare has `is_belief_eligible=false`

### TC-4.6: Eligibility filter - long original posts included
1. Post a long (>100 chars) original post
2. Sync posts
3. **Expected**: Post has `is_belief_eligible=true`

### TC-4.7: Duplicate prevention
1. Click "Sync Posts" twice
2. Check raw_posts count
3. **Expected**: No duplicate entries (same platform_post_id)

### TC-4.8: Rate limit handling
1. Trigger rate limit (if possible)
2. **Expected**: Error message "Rate limited by LinkedIn"

---

## Sprint 5: Publish to LinkedIn

### TC-5.1: Publish button appears in editor
1. Open a draft in the editor
2. Hover over the floating header
3. **Expected**: "Publish" button visible (subtle gray styling)

### TC-5.2: Publish button opens modal
1. Click "Publish" button
2. **Expected**: PublishModal opens with preview

### TC-5.3: Preview strips markdown
1. Draft contains `**bold**` and `# heading`
2. Open publish modal
3. **Expected**: Preview shows plain text without markdown syntax

### TC-5.4: Character count displayed
1. Open publish modal with any draft
2. **Expected**: Shows "X / 3,000 characters"

### TC-5.5: Over limit warning
1. Create draft with >3000 characters
2. Open publish modal
3. **Expected**: Red character count, "exceeds limit" message, Publish button disabled

### TC-5.6: Publish creates LinkedIn post
1. Open short draft (<3000 chars)
2. Click "Publish to LinkedIn"
3. Check LinkedIn profile
4. **Expected**: Post appears on LinkedIn

### TC-5.7: Published_posts record created
1. After successful publish
2. Check `published_posts` table
3. **Expected**: Row with correct draft_id, platform='linkedin', platform_post_id

### TC-5.8: Draft status updated
1. After successful publish
2. Check `drafts` table for the published draft
3. **Expected**: status='published', linkedin_post_urn filled, published_at set

### TC-5.9: Success state shows link
1. After successful publish
2. View modal
3. **Expected**: "Successfully Published" with "View on LinkedIn" link

### TC-5.10: View on LinkedIn link works
1. Click "View on LinkedIn" link
2. **Expected**: Opens LinkedIn post in new tab

### TC-5.11: Cancel closes modal
1. Open publish modal
2. Click "Cancel"
3. **Expected**: Modal closes, no post made

### TC-5.12: LinkedIn not connected error
1. Disconnect LinkedIn
2. Try to publish
3. **Expected**: Error "LinkedIn not connected"

### TC-5.13: Token expired error
1. Let token expire (or manually invalidate)
2. Try to publish
3. **Expected**: Error "LinkedIn token expired. Please reconnect."

---

## Sprint 6: Belief Confidence Model

### TC-6.1: Confidence level displayed on BeliefCard
1. Navigate to Beliefs tab in workspace
2. View any belief card
3. **Expected**: Shows "LOW/MEDIUM/HIGH CONFIDENCE" label

### TC-6.2: Low confidence is amber
1. View a belief with `confidence_level='low'` in DB
2. **Expected**: Confidence label is amber/yellow color

### TC-6.3: Medium confidence is gray
1. View a belief with `confidence_level='medium'`
2. **Expected**: Confidence label is gray

### TC-6.4: High confidence is green
1. View a belief with `confidence_level='high'`
2. **Expected**: Confidence label is green

### TC-6.5: Stable badge displayed
1. View a belief with `is_stable=true` in DB
2. **Expected**: Blue "STABLE" badge visible

### TC-6.6: No stable badge when not stable
1. View a belief with `is_stable=false`
2. **Expected**: No "STABLE" badge

### TC-6.7: Evidence count displayed
1. View a belief with evidence_count > 1
2. **Expected**: Shows "X Evidence" in meta line

---

## Edge Cases

### TC-E.1: Unauthenticated user can't access settings
1. Sign out
2. Navigate to `/settings`
3. **Expected**: Redirect to sign-in

### TC-E.2: Network error handling
1. Disable network
2. Try to connect LinkedIn
3. **Expected**: Graceful error message

### TC-E.3: Empty workspace with no integrations
1. New user with no connected accounts
2. View `/settings`
3. **Expected**: All integrations show "Connect" or "Coming Soon"

### TC-E.4: Multiple drafts can be published
1. Publish draft A
2. Publish draft B
3. **Expected**: Both appear on LinkedIn, both tracked in published_posts

### TC-E.5: Same draft published twice
1. Publish draft A
2. Try to publish draft A again
3. **Expected**: Creates second LinkedIn post (or prevents duplicate - TBD)

---

## Checklist Summary

| Sprint | Test Cases | Status |
|--------|------------|--------|
| 1: Database | TC-1.1 to TC-1.5 | [ ] |
| 2: Settings UI | TC-2.1 to TC-2.5 | [ ] |
| 3: OAuth | TC-3.1 to TC-3.7 | [ ] |
| 4: Fetch Posts | TC-4.1 to TC-4.8 | [ ] |
| 5: Publish | TC-5.1 to TC-5.13 | [ ] |
| 6: Confidence | TC-6.1 to TC-6.7 | [ ] |
| Edge Cases | TC-E.1 to TC-E.5 | [ ] |

**Total: 45 test cases**
