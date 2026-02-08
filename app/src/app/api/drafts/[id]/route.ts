import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/user-sync';


// DELETE /api/drafts/[id] - Delete a draft
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: clerkId } = await auth();
        const { id } = await params;

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
        }

        const draftId = id;

        // Verify ownership before deleting
        const { data: existing } = await supabase
            .from('drafts')
            .select('id')
            .eq('id', draftId)
            .eq('user_id', userId)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
        }

        const { error } = await supabase
            .from('drafts')
            .delete()
            .eq('id', draftId)
            .eq('user_id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[DELETE /api/drafts/[id]] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PATCH /api/drafts/[id] - Update a draft
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: clerkId } = await auth();
        const { id } = await params;

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const draftId = id;

        let userId: string | null = null;
        try {
            userId = await getOrCreateUser();
        } catch (uErr) {
            console.error('getOrCreateUser threw:', uErr);
        }

        if (!userId) {
            console.error('Failed to get/create user in PATCH');
            return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
        }

        const body = await req.json();

        // Extract all possible fields
        const { content, status, brain_metadata, platform_metadata, belief_text } = body;

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

        // Conditionally add fields if they exist in the request
        if (content !== undefined) updateData.content = content;
        if (status !== undefined) updateData.status = status;
        if (brain_metadata !== undefined) updateData.brain_metadata = brain_metadata;
        if (platform_metadata !== undefined) updateData.platform_metadata = platform_metadata;
        if (belief_text !== undefined) updateData.belief_text = belief_text;

        const { data: initialDraft, error } = await supabase
            .from('drafts')
            .update(updateData)
            .eq('id', draftId)
            .eq('user_id', userId)
            .select()
            .maybeSingle();

        let draft = initialDraft;

        if (error) {
            console.error('[PATCH Error] Supabase update failed:', error);
            throw error;
        }

        // AUTO-HEAL: If draft doesn't exist, check if it's in content_items
        if (!draft) {
            console.warn(`[PATCH Warning] Draft not found in drafts table. Attempting recovery for ID: ${draftId}`);
            const { data: contentItem } = await supabase
                .from('content_items')
                .select('*')
                .eq('id', draftId)
                .eq('user_id', userId)
                .maybeSingle();

            if (contentItem) {
                console.log(`[PATCH Recovery] Found content item. Restoring draft row...`);
                const { data: restored, error: restoreError } = await supabase
                    .from('drafts')
                    .upsert({
                        id: contentItem.id,
                        user_id: userId,
                        belief_text: contentItem.hook || contentItem.angle || 'Untitled Draft',
                        content: (updateData.content as string) || contentItem.draft_content || '',
                        status: (updateData.status as string) || (contentItem.stage === 'published' ? 'published' : 'draft'),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' })
                    .select()
                    .maybeSingle();

                if (restoreError) console.error('[PATCH Recovery] Critical failure:', restoreError);
                draft = restored;
            }
        }

        if (!draft) {
            console.warn(`[PATCH Warning] Final check: Draft still not found or user mismatch. ID: ${draftId}, User: ${userId}`);
            return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ draft, success: true });
    } catch (error: unknown) {
        console.error('[PATCH /api/drafts/[id]] Error:', error);
        // Return more detail if possible
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message, details: error }, { status: 500 });
    }
}
