
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { voiceService } from '@/lib/voice/service';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

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

        const body = await req.json();
        const { draftId, finalContent } = body;

        if (!draftId || !finalContent) {
            return NextResponse.json({ error: 'draftId and finalContent are required' }, { status: 400 });
        }

        // 1. Fetch Draft & Metadata to find Initial AI Version
        // We check content_items first as it holds rich metadata
        // Or drafts table if metadata was synced
        // Let's check drafts table first
        let { data: draft } = await supabaseAdmin
            .from('drafts')
            .select('*, content_items!left(brain_metadata)')
            .eq('id', draftId)
            .single();

        // If not found in drafts, maybe check content_items directly (unlikely if we are finalizing)
        // But the join above should work if relation exists.
        // Wait, drafts table has NO foreign key to content_items in my knowledge, but they share ID?
        // Let's assume shared ID.

        // Actually, if relation isn't set up in Supabase, the join fails.
        // Safer to fetch content_item separately if brain_metadata is missing from draft.

        // Wait, GET /api/drafts manually maps it.
        // So fetching draft might not give metadata.
        // Let's fetch content_item by ID.
        const { data: contentItem } = await supabaseAdmin
            .from('content_items')
            .select('brain_metadata')
            .eq('id', draftId)
            .single();

        const initialDraft = contentItem?.brain_metadata?.initial_draft;

        if (!initialDraft) {
            // Cannot learn without baseline
            return NextResponse.json({
                learned: false,
                message: "No initial AI draft found to compare against. Future drafts will support learning."
            });
        }

        // 2. Perform Learning Analysis
        const result = await voiceService.learnFromEdits(userId, initialDraft, finalContent);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Learning Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
