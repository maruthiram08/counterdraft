import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { generateDraftTitle, needsRetitle } from '@/lib/brain/title';

export const dynamic = 'force-dynamic';

const BATCH = 10;

// POST /api/drafts/retitle - Replace brief-style titles ("Explore the deeper reasons ... This post would ...")
// on the user's existing drafts with real headlines. Safe to call repeatedly: it only touches titles that need it.
export async function POST() {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [{ data: drafts, error }, { data: items }] = await Promise.all([
            supabase.from('drafts').select('id, belief_text, content').eq('user_id', userId),
            supabase.from('content_items').select('id, hook, angle').eq('user_id', userId),
        ]);
        if (error) throw error;

        const itemsById = new Map((items || []).map(i => [i.id, i]));
        const stale = (drafts || []).filter(d =>
            d.content?.trim() && needsRetitle(d.belief_text, { angle: itemsById.get(d.id)?.angle })
        );

        const batch = stale.slice(0, BATCH);
        const updated = await Promise.all(batch.map(async d => {
            const item = itemsById.get(d.id);
            const title = await generateDraftTitle({ content: d.content, hook: item?.hook || d.belief_text, angle: item?.angle });
            if (!title || title === d.belief_text) return null;
            const { error: updateError } = await supabase
                .from('drafts')
                .update({ belief_text: title })
                .eq('id', d.id)
                .eq('user_id', userId);
            if (updateError) {
                console.error('[POST /api/drafts/retitle] update failed', d.id, updateError);
                return null;
            }
            return { id: d.id, title };
        }));

        const done = updated.filter(Boolean);
        return NextResponse.json({ updated: done, remaining: stale.length - batch.length });
    } catch (error: unknown) {
        console.error('[POST /api/drafts/retitle] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
