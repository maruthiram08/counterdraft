import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { mapDebate, type DebateStory } from '@/lib/explore/debate';

// Groups a search's stories into the takes they make and suggests the take nobody is making
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limitResult = rateLimit(`explore-debate:${userId || getClientIp(req)}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        const body = await req.json();
        const query = typeof body.query === 'string' ? body.query.trim().slice(0, 300) : '';
        const stories: DebateStory[] = (Array.isArray(body.stories) ? body.stories : [])
            .filter((s: unknown): s is DebateStory => typeof (s as DebateStory)?.title === 'string')
            .slice(0, 15)
            .map((s: DebateStory) => ({
                title: s.title.slice(0, 300),
                summary: typeof s.summary === 'string' ? s.summary.slice(0, 400) : undefined,
                source: typeof s.source === 'string' ? s.source.slice(0, 80) : undefined,
            }));
        if (!query) {
            return NextResponse.json({ error: 'Missing search' }, { status: 400 });
        }

        return NextResponse.json({ debate: await mapDebate(query, stories) });
    } catch (err) {
        console.error('Debate API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
