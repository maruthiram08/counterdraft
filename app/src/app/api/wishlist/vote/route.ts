import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { feature_id, vote_type } = body; // 1 or -1 or 0 (remove)

        if (!feature_id) {
            return NextResponse.json({ error: 'Feature ID required' }, { status: 400 });
        }

        // Check if vote exists
        const { data: existingVote } = await supabaseAdmin
            .from('feature_votes')
            .select('*')
            .eq('user_id', userId)
            .eq('feature_id', feature_id)
            .single();

        let error;

        if (existingVote) {
            // Update or toggle
            if (existingVote.vote_type === vote_type) {
                // Remove vote (toggle off)
                const { error: delErr } = await supabaseAdmin
                    .from('feature_votes')
                    .delete()
                    .eq('user_id', userId)
                    .eq('feature_id', feature_id);
                error = delErr;
            } else {
                // Change vote
                const { error: upErr } = await supabaseAdmin
                    .from('feature_votes')
                    .update({ vote_type })
                    .eq('user_id', userId)
                    .eq('feature_id', feature_id);
                error = upErr;
            }
        } else {
            // New vote
            const { error: insErr } = await supabaseAdmin
                .from('feature_votes')
                .insert({
                    user_id: userId,
                    feature_id,
                    vote_type
                });
            error = insErr;
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Recalculate total votes for the feature (simple approach)
        // In a real high-scale app, we'd use a trigger or increment, but count is fine for now.
        const { count } = await supabaseAdmin
            .from('feature_votes')
            .select('*', { count: 'exact', head: true })
            .eq('feature_id', feature_id)
            .eq('vote_type', 1);

        const { count: down } = await supabaseAdmin
            .from('feature_votes')
            .select('*', { count: 'exact', head: true })
            .eq('feature_id', feature_id)
            .eq('vote_type', -1);

        const total = (count || 0) - (down || 0);

        // Update feature
        await supabaseAdmin
            .from('feature_requests')
            .update({ upvotes: total })
            .eq('id', feature_id);

        return NextResponse.json({ success: true, new_total: total }, { status: 200 });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
