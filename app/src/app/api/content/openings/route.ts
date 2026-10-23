import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { rateLimit } from '@/lib/rate-limit';
import { voiceService } from '@/lib/voice/service';
import { suggestOpenings } from '@/lib/brain/openings';
import { LINKEDIN_MAX_CHARS } from '@/lib/editor/openings';

// POST { draft, brainMetadata? } -> three new openings for the draft, and a rating of the current one
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const limit = rateLimit(`openings:${userId}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limit.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
        }

        const body = await req.json();
        const draft = typeof body.draft === 'string' ? body.draft.trim().slice(0, LINKEDIN_MAX_CHARS * 2) : '';
        if (draft.length < 80) {
            return NextResponse.json({ error: 'Write a little more of the post first.' }, { status: 400 });
        }
        const meta = body.brainMetadata && typeof body.brainMetadata === 'object' ? body.brainMetadata : undefined;

        let voice = '';
        try {
            const profile = await voiceService.getProfile(userId);
            if (profile?.is_active) voice = [profile.voice_tone, ...(profile.rules || []).slice(0, 8)].filter(Boolean).join('; ');
        } catch {
            // The openings still work without the voice profile
        }

        const result = await suggestOpenings({ draft, meta, voice });
        if (!result.options.length) {
            return NextResponse.json({ error: 'No openings came back. Try again.' }, { status: 502 });
        }
        return NextResponse.json(result);
    } catch (err) {
        console.error('Openings error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
