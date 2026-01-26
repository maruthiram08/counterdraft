
import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { content } = await req.json();

        if (!content) {
            return NextResponse.json({ quotes: [] });
        }

        const completion = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert editor finding "quotable moments" in a text.
Extract 5-7 punchy, standalone quotes or hooks from the provided text.
- They must be short (less than 150 chars).
- They must make sense out of context.
- Include a mix of:
  1. Short punchy statements (3-5 words)
  2. Insightful sentences (10-15 words)
  3. Power questions
  
RETURN JSON: { "quotes": ["Quote 1", "Quote 2"] }`
                },
                {
                    role: "user",
                    content: `Text:\n${content}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json({ quotes: result.quotes || [] });

    } catch (error) {
        console.error("Quote extraction error:", error);
        return NextResponse.json({ error: "Failed to extract quotes" }, { status: 500 });
    }
}
