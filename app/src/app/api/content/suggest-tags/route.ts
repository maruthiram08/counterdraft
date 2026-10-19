import { NextResponse } from 'next/server';
import { suggestTags } from '@/lib/brain/ideation';
import { getOrCreateUser } from '@/lib/user-sync';

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content } = await req.json();

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const tags = await suggestTags(content);

        return NextResponse.json({ tags });
    } catch (e: unknown) {
        console.error("Tag suggestion failed:", e);
        const message = e instanceof Error ? e.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
