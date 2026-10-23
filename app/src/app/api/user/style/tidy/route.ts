import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { rateLimit } from '@/lib/rate-limit';
import { voiceService } from '@/lib/voice/service';

// POST -> a tidier version of the active voice profile's rules, for the writer to review. Nothing is saved here.
export async function POST() {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const limit = rateLimit(`style-tidy:${userId}`, { windowMs: 15 * 60 * 1000, max: 10 });
        if (!limit.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
        }
        const proposal = await voiceService.tidyRules(userId);
        return NextResponse.json(proposal);
    } catch (error: unknown) {
        console.error('[Style Tidy Error]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
