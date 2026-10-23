import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { answerAboutStory, cleanHistory } from '@/lib/explore/story-chat';

export const maxDuration = 30;

// A follow-up question about the story the writer has open, answered from its text
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limitResult = rateLimit(`explore-ask:${userId || getClientIp(req)}`, { windowMs: 15 * 60 * 1000, max: 40 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many questions. Please try again in 15 minutes.' }, { status: 429 });
        }

        const body = await req.json();
        const url = typeof body.url === 'string' ? body.url.trim() : '';
        const title = typeof body.title === 'string' ? body.title.trim().slice(0, 300) : '';
        const question = typeof body.question === 'string' ? body.question.trim().slice(0, 600) : '';
        if (!url || !title || !question) {
            return NextResponse.json({ error: 'A story and a question are required' }, { status: 400 });
        }

        const answer = await answerAboutStory({
            url,
            title,
            question,
            history: cleanHistory(body.history),
            query: typeof body.query === 'string' ? body.query.slice(0, 300) : undefined,
        });
        if (!answer) {
            return NextResponse.json({ error: "Couldn't read this one, so I can't answer from it. Open the full piece instead." }, { status: 422 });
        }
        return NextResponse.json({ answer });
    } catch (err) {
        console.error('Story chat API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
