import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { findAudienceQuestions } from '@/lib/explore/questions';

// Questions people are asking about a search, loaded after the stories so they never slow the search down
export async function GET(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limitResult = rateLimit(`explore-questions:${userId || getClientIp(req)}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        const query = new URL(req.url).searchParams.get('q')?.trim();
        if (!query) {
            return NextResponse.json({ error: 'Missing search' }, { status: 400 });
        }

        const questions = await findAudienceQuestions(query.slice(0, 300));
        return NextResponse.json({ questions });
    } catch (err) {
        console.error('Questions API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
