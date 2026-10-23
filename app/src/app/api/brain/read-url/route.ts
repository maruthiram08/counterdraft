import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { readPage } from '@/lib/read-page';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const { title, content: cleanContent } = await readPage(url);

        return NextResponse.json({
            title,
            content: cleanContent // Full content, no limit
        });

    } catch (error: unknown) {
        console.error('Scrape error:', error);
        const details = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: 'Failed to read content', details }, { status: 500 });
    }
}
