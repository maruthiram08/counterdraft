
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';

import { UsageService } from '@/lib/billing/usage';

export const dynamic = 'force-dynamic';

// GET /api/drafts - List all drafts for authenticated user
export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
        }

        // 1. Fetch Drafts (from drafts table)
        const { data: draftsData, error } = await supabase
            .from('drafts')
            .select('*, published_posts(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Fetch Content Items (to sync metadata & check for orphans)
        const { data: contentItems } = await supabase
            .from('content_items')
            .select('id, brain_metadata, hook, stage, draft_content')
            .eq('user_id', userId);

        // 3. Map existing drafts with metadata
        const drafts = (draftsData || []).map(draft => {
            // Find corresponding content item
            const item = contentItems?.find(ci =>
                ci.id === draft.id ||
                ci.brain_metadata?.repurpose?.linkedDraftId === draft.id
            );

            const metadata = item?.brain_metadata || {};
            const repurposeData = metadata.repurpose || {};

            return {
                ...draft,
                labels: {
                    platform: repurposeData.platform || metadata.platform,
                    length: repurposeData.length || metadata.length,
                    parentId: repurposeData.parentId // Critical for grouping
                }
            };
        });

        // 4. AUTO-HEAL: Check for orphans (items marked 'draft' in content_items but missing from drafts table)
        const existingDraftIds = new Set(drafts.map(d => d.id));
        const orphans = (contentItems || [])
            .filter(ci =>
                (ci.stage === 'draft') && // It thinks it is a draft
                !existingDraftIds.has(ci.id) // But it is not in the drafts list
            )
            .map(ci => ({
                id: ci.id,
                user_id: userId,
                belief_text: ci.hook || 'Untitled Draft',
                content: ci.draft_content || '',
                status: 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                published_posts: [],
                labels: {
                    platform: ci.brain_metadata?.platform,
                    length: ci.brain_metadata?.length,
                    parentId: ci.brain_metadata?.repurpose?.parentId
                },
                is_healed: true // Flag for debugging
            }));

        // Combine and sort
        const allDrafts = [...drafts, ...orphans].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return NextResponse.json({ drafts: allDrafts });
    } catch (error: any) {
        console.error('[GET /api/drafts] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/drafts - Save a new draft
export async function POST(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
        }

        const { beliefText, content, id } = await req.json();

        if (!beliefText || !content) {
            return NextResponse.json(
                { error: 'beliefText and content are required' },
                { status: 400 }
            );
        }

        // CHECK USAGE LIMITS
        // 1. If no ID, it's a new draft -> Check Limit.
        // 2. If ID exists, we must check if it's already in the drafts table.
        //    If it IS in table, it's an update (Free).
        //    If NOT in table, it's a new draft (Wizard Flow / Sync) -> Check Limit.

        let isCreation = !id;

        if (id) {
            console.log(`[POST /api/drafts] Checking existence for ID: ${id} with User: ${userId}`);
            const { data: existing } = await supabase
                .from('drafts')
                .select('id')
                .eq('id', id)
                .single();

            if (!existing) {
                isCreation = true;
            }
            console.log(`[POST /api/drafts] Exists? ${!!existing} | isCreation: ${isCreation}`);
        }

        if (isCreation) {
            const limitCheck = await UsageService.checkDraftLimit(userId);
            if (!limitCheck.allowed) {
                return NextResponse.json(
                    {
                        error: 'Limit Reached',
                        message: limitCheck.reason,
                        tier: limitCheck.tier,
                        upgradeUrl: '/pricing'
                    },
                    { status: 403 }
                );
            }
        }

        const { data: draft, error } = await supabase
            .from('drafts')
            .insert({
                ...(id ? { id } : {}),
                user_id: userId,
                belief_text: beliefText,
                content: content,
                status: 'draft'
            })
            .select()
            .single();

        if (error) throw error;

        // Increment if we just created a new one
        if (isCreation) {
            console.log(`[POST /api/drafts] Incrementing usage for User ${userId}`);
            await UsageService.incrementDraftCount(userId);
        }

        return NextResponse.json({ draft, success: true });
    } catch (error: any) {
        console.error('[POST /api/drafts] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
