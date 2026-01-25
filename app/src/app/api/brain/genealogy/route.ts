
import { NextRequest, NextResponse } from 'next/server';
import { brainService } from '@/lib/brain/service';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { topic } = await req.json();
        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        // 1. Fetch Root/Pillar Beliefs
        const { data: rootBeliefs, error } = await supabaseAdmin
            .from('beliefs')
            .select('id, statement, belief_type')
            .eq('user_id', userId)
            .in('belief_type', ['root', 'pillar', 'core']); // Include 'core' as fallback for legacy data

        if (error) {
            console.error('Error fetching root beliefs:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const roots = (rootBeliefs || []).map(b => ({
            id: b.id,
            statement: b.statement,
            type: b.belief_type
        }));

        // 2. Analyze Genealogy
        const result = await brainService.analyzeGenealogy(topic, roots);

        return NextResponse.json(result);

    } catch (e) {
        console.error('Genealogy API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
