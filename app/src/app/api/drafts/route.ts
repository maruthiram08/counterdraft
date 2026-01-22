import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/user-sync';

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

        const { data: draftsData, error } = await supabase
            .from('drafts')
            .select('*, published_posts(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch content items to get metadata (Platform, Length, Parent)
        const { data: contentItems } = await supabase
            .from('content_items')
            .select('id, brain_metadata, hook')
            .eq('user_id', userId);

        const drafts = draftsData.map(draft => {
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

        return NextResponse.json({ drafts });
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

        return NextResponse.json({ draft, success: true });
    } catch (error: any) {
        console.error('[POST /api/drafts] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
