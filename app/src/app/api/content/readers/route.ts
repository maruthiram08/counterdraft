import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { rateLimit } from '@/lib/rate-limit';
import { askReaders } from '@/lib/brain/readers';
import { LINKEDIN_MAX_CHARS } from '@/lib/editor/openings';
import { PANEL_SIZE, Reader } from '@/lib/editor/readers';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST { draft, brainMetadata?, readers?, openings? } -> each imagined reader's reaction to the draft
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const limit = rateLimit(`readers:${userId}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limit.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
        }

        const body = await req.json();
        const draft = str(body.draft, LINKEDIN_MAX_CHARS * 2);
        if (draft.length < 80) {
            return NextResponse.json({ error: 'Write a little more of the post first.' }, { status: 400 });
        }
        const meta = body.brainMetadata && typeof body.brainMetadata === 'object' ? body.brainMetadata : undefined;
        const readers: Reader[] = (Array.isArray(body.readers) ? body.readers : [])
            .map((r: { name?: unknown; who?: unknown }) => ({ name: str(r?.name, 30), who: str(r?.who, 120) }))
            .filter((r: Reader) => r.name && r.who)
            .slice(0, PANEL_SIZE);
        const openings: string[] = (Array.isArray(body.openings) ? body.openings : [])
            .map((o: unknown) => str(o, 400))
            .filter(Boolean)
            .slice(0, 4);

        const result = await askReaders({ draft, meta, readers, openings });
        if (!result.readers.length) {
            return NextResponse.json({ error: 'The readers did not answer. Try again.' }, { status: 502 });
        }
        return NextResponse.json(result);
    } catch (err) {
        console.error('Reader panel error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
