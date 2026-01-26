import { NextResponse } from 'next/server';
import { suggestTags } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { content } = await req.json();

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const tags = await suggestTags(content);

        return NextResponse.json({ tags });
    } catch (e: any) {
        console.error("Tag suggestion failed:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
