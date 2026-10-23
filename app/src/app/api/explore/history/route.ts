import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { rateLimit } from '@/lib/rate-limit';
import { findTopicHistory } from '@/lib/explore/history-search';
import type { PastPiece } from '@/lib/explore/history';

// POST { query, stories: string[] } -> whether the writer has written on this before, and what changed since
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const limit = rateLimit(`explore-history:${userId}`, { windowMs: 15 * 60 * 1000, max: 30 });
        if (!limit.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
        }

        const body = await req.json();
        const query = typeof body.query === 'string' ? body.query.trim().slice(0, 300) : '';
        if (!query) return NextResponse.json({ error: 'A query is required' }, { status: 400 });
        const stories: string[] = Array.isArray(body.stories)
            ? body.stories.filter((s: unknown): s is string => typeof s === 'string').map((s: string) => s.slice(0, 300)).slice(0, 10)
            : [];

        // Their own LinkedIn posts, and what they've drafted or published in the Pipeline
        const [posts, items] = await Promise.all([
            supabaseAdmin
                .from('raw_posts')
                .select('id, content, posted_at, created_at')
                .eq('user_id', userId)
                .eq('is_inspiration', false)
                .order('created_at', { ascending: false })
                .limit(40),
            supabaseAdmin
                .from('content_items')
                .select('id, hook, angle, stage, updated_at')
                .eq('user_id', userId)
                .in('stage', ['draft', 'published'])
                .order('updated_at', { ascending: false })
                .limit(20),
        ]);

        const pieces: PastPiece[] = [
            ...(items.data || []).map(i => ({
                id: i.id,
                kind: (i.stage === 'published' ? 'post' : 'draft') as PastPiece['kind'],
                text: [i.hook, i.angle].filter(Boolean).join(' — '),
                date: i.updated_at,
            })),
            ...(posts.data || []).map(p => ({ id: p.id, kind: 'post' as const, text: p.content || '', date: p.posted_at || p.created_at })),
        ].filter(p => p.text.trim() && p.date);

        const history = await findTopicHistory(userId, query, stories, pieces);
        return NextResponse.json({ history });
    } catch (err) {
        console.error('Explore history error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
