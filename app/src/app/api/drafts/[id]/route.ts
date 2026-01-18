import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/user-sync';

// DELETE /api/drafts/[id] - Delete a draft
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
        }

        const draftId = params.id;

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
    } catch (error: any) {
        console.error('[DELETE /api/drafts/[id]] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/drafts/[id] - Update a draft
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
        }

        const draftId = params.id;
        const { content, status } = await req.json();

        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (content !== undefined) updateData.content = content;
        if (status !== undefined) updateData.status = status;

        const { data: draft, error } = await supabase
            .from('drafts')
            .update(updateData)
            .eq('id', draftId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ draft, success: true });
    } catch (error: any) {
        console.error('[PATCH /api/drafts/[id]] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
