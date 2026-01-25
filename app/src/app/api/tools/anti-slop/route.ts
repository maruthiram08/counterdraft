import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { AntiSlopService } from '@/lib/tools/anti-slop';
import { openai } from '@/lib/openai';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { text, mode, selection } = await req.json();

        if (!text && !selection) {
            return NextResponse.json({ error: 'Content required' }, { status: 400 });
        }

        // Mode: 'scan' (local dictionary) or 'rewrite' (AI)
        if (mode === 'rewrite') {
            const prompt = `
                Rewrite the following text to remove "AI Slop", corporate jargon, and overused cliches. 
                Make it sound human, direct, and punchy. Avoid words like "delve", "tapestry", "complex landscape", etc.
                Keep the same meaning and core message.
                
                Text to rewrite:
                "${selection || text}"
                
                Output ONLY the rewritten text.
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });

            return NextResponse.json({ rewritten: response.choices[0].message.content });
        }

        // Default: Scan
        const matches = AntiSlopService.scan(text);
        return NextResponse.json({ matches });

    } catch (error) {
        console.error("Anti-Slop API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
