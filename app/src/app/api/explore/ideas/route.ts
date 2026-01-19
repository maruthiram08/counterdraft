import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Support both single title and array of titles
        let titles: string[] = [];
        if (body.titles && Array.isArray(body.titles)) {
            titles = body.titles;
        } else if (body.title) {
            titles = [body.title];
        } else if (body.topic) {
            titles = [body.topic];
        }

        if (titles.length === 0) {
            return NextResponse.json({ error: 'Topic or titles required' }, { status: 400 });
        }

        const subject = titles.length > 1
            ? `Multiple topics: ${titles.join('; ')}`
            : titles[0];

        const systemPrompt = `You are a content strategist helping a thought leader create LinkedIn posts.
Given a trending topic, suggest 3 compelling post ideas. Each idea should have:
- A hook (attention-grabbing opening line)
- An angle (the unique perspective or argument)
- A format suggestion (story, listicle, hot take, question, etc.)

Be provocative and interesting. Avoid generic advice.

Output as JSON:
{
  "ideas": [
    {
      "hook": "opening line",
      "angle": "the perspective",
      "format": "suggested format"
    }
  ]
}`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Generate 3 post ideas about: "${subject}"` }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
        });

        const result = completion.choices[0].message.content;
        if (!result) throw new Error("No response from OpenAI");

        const parsed = JSON.parse(result);

        return NextResponse.json({ ideas: parsed.ideas || [] });
    } catch (err: any) {
        console.error('Post Ideas API Error:', err);
        return NextResponse.json({ error: 'Failed to generate ideas', details: err.message }, { status: 500 });
    }
}
