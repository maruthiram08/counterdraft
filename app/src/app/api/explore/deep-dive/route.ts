import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { buildDeepDive } from '@/lib/explore/deep-dive';

export const maxDuration = 30;

// Reads the story the writer opened and briefs them on it: summary, key points, viewpoints, open questions
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limitResult = rateLimit(`explore-deep-dive:${userId || getClientIp(req)}`, { windowMs: 15 * 60 * 1000, max: 40 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        const body = await req.json();
        const url = typeof body.url === 'string' ? body.url.trim() : '';
        const title = typeof body.title === 'string' ? body.title.trim().slice(0, 300) : '';
        if (!url || !title) {
            return NextResponse.json({ error: 'A story link and title are required' }, { status: 400 });
        }

        const dive = await buildDeepDive({
            url,
            title,
            query: typeof body.query === 'string' ? body.query.slice(0, 300) : undefined,
            kind: typeof body.kind === 'string' ? body.kind : undefined,
        });
        if (!dive) {
            return NextResponse.json({ error: "Couldn't read this one. Open the full piece instead." }, { status: 422 });
        }
        return NextResponse.json({ dive });
    } catch (err) {
        console.error('Deep dive API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
