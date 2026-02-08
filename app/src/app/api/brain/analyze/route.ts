import { NextResponse } from 'next/server';
import { brainService } from '@/lib/brain/service';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { Belief } from '@/types';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// POST /api/brain/analyze
// Body: { topic: string, audience?: { role: string, pain: string } }
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 0. Rate Limiting
        const ip = getClientIp(req);
        const limitResult = rateLimit(`analyze:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        const body = await req.json();
        const { topic, audience } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic required' }, { status: 400 });
        }

        // 1. Fetch User's Beliefs
        // In a real app we might cache this or filter by relevance (vector search)
        // For V1 we fetch all 'confirmed' beliefs
        const { data: beliefs, error } = await supabaseAdmin
            .from('beliefs')
            .select('*')
            .eq('user_id', userId)
            // .in('type', ['core', 'emerging']) // Optional: narrow down
            .eq('user_confirmed', true);

        if (error) throw error;

        // 2. Parallelize Logic
        const [confidence, outcome] = await Promise.all([
            brainService.calculateConfidence(topic, beliefs as Belief[]),
            brainService.inferOutcome(topic, audience)
        ]);

        return NextResponse.json({
            confidence,
            outcome
        });

    } catch (err: unknown) {
        console.error('Brain Analyze API Error:', err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
