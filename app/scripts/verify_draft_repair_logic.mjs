/**
 * scripts/verify_draft_repair_logic.mjs
 * 
 * This script validates the "Auto-Heal" logic implemented in /api/drafts/route.ts.
 * It simulates a scenario where a draft exists in 'content_items' but is missing from the 'drafts' table.
 * 
 * usage: node scripts/verify_draft_repair_logic.mjs
 */

console.log("🧪 Starting Draft Repair Logic Test...");

// --- MOCK DATA ---

// 1. Existing Drafts (from 'drafts' table)
const dbDrafts = [
    {
        id: "draft-1",
        content: "I am a normal draft",
        created_at: "2024-01-01T10:00:00Z"
    }
];

// 2. Content Items (from 'content_items' table)
// Includes:
// - The normal draft (synced)
// - An ORPHANED draft (exists here as 'draft', but missing from 'drafts' table)
// - An Idea (should be ignored)
const dbContentItems = [
    {
        id: "draft-1",
        stage: "draft",
        hook: "Normal Draft Hook",
        draft_content: "I am a normal draft",
        brain_metadata: { platform: "linkedin" }
    },
    {
        id: "orphan-1",
        stage: "draft",
        hook: "I am an Orphan",
        draft_content: "Repair me please",
        brain_metadata: { platform: "twitter", length: "short" }
    },
    {
        id: "idea-1",
        stage: "idea",
        hook: "Just an idea",
        draft_content: null
    }
];

console.log(`\nMock Data:`);
console.log(`- Drafts in table: ${dbDrafts.length}`);
console.log(`- Content Items: ${dbContentItems.length} (1 matching, 1 orphan, 1 idea)`);


// --- LOGIC UNDER TEST (Cleaned from API route) ---

function getDraftsList(draftsData, contentItems) {
    // 3. Map existing drafts with metadata (Standard Logic)
    const drafts = draftsData.map(draft => {
        const item = contentItems.find(ci => ci.id === draft.id);
        const metadata = item?.brain_metadata || {};
        const repurposeData = metadata.repurpose || {};

        return {
            ...draft,
            labels: {
                platform: repurposeData.platform || metadata.platform,
                length: repurposeData.length || metadata.length,
                parentId: repurposeData.parentId
            }
        };
    });

    // 4. AUTO-HEAL: Check for orphans
    const existingDraftIds = new Set(drafts.map(d => d.id));
    
    const orphans = contentItems
        .filter(ci =>
            (ci.stage === 'draft') &&        // It thinks it is a draft
            !existingDraftIds.has(ci.id)     // But it is not in the drafts list
        )
        .map(ci => ({
            id: ci.id,
            user_id: "mock-user",
            belief_text: ci.hook || 'Untitled Draft',
            content: ci.draft_content || '',
            status: 'draft',
            created_at: new Date().toISOString(), // Mock timestamp
            updated_at: new Date().toISOString(),
            published_posts: [],
            labels: {
                platform: ci.brain_metadata?.platform,
                length: ci.brain_metadata?.length,
                parentId: ci.brain_metadata?.repurpose?.parentId
            },
            is_healed: true // Flag
        }));

    // Combine and sort
    return [...drafts, ...orphans].sort((a, b) => 
        // Simple sort logic for test
        (b.id > a.id ? 1 : -1) 
    );
}

// --- EXECUTION ---

const result = getDraftsList(dbDrafts, dbContentItems);

console.log(`\n✅ Result: ${result.length} drafts found.`);

// --- ASSERTIONS ---

const normal = result.find(d => d.id === 'draft-1');
const orphan = result.find(d => d.id === 'orphan-1');
const idea = result.find(d => d.id === 'idea-1');

let passed = true;

if (normal) {
    console.log(`[PASS] Found normal draft.`);
} else {
    console.error(`[FAIL] Missing normal draft.`);
    passed = false;
}

if (orphan) {
    console.log(`[PASS] Found orphaned draft (Auto-Healed). Content: "${orphan.content}"`);
    if (orphan.labels.platform === 'twitter') {
        console.log(`[PASS] Orphan metadata preserved (Platform: Twitter).`);
    } else {
        console.error(`[FAIL] Orphan metadata missing.`);
        passed = false;
    }
} else {
    console.error(`[FAIL] Logic failed to repair orphaned draft.`);
    passed = false;
}

if (!idea) {
    console.log(`[PASS] Ignored non-draft item (Idea).`);
} else {
    console.error(`[FAIL] Incorrectly included 'idea' stage item.`);
    passed = false;
}

if (passed) {
    console.log("\n✨ TEST PASSED: Auto-heal logic is correct.");
    process.exit(0);
} else {
    console.log("\n❌ TEST FAILED.");
    process.exit(1);
}
