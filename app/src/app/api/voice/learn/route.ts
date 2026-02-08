
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

        // 1. Fetch Draft Metadata to find Initial AI Version
        // Fetch content_item by ID since drafts may not include metadata.
        const { data: contentItem } = await supabaseAdmin
            .from('content_items')
            .select('brain_metadata')
            .eq('id', draftId)
            .eq('user_id', userId)
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

    } catch (error: unknown) {
        console.error('Learning Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
