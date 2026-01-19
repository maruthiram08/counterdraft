import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOrCreateUser } from '@/lib/user-sync';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, hook, angle, deep_dive, outline } = await req.json();

        if (action === 'deep_dive') {
            // Step 1: Research and analyze the topic
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a research assistant helping a thought leader prepare content.
Given a topic hook and angle, provide:
1. Research findings: 4-5 relevant facts, statistics, or context
2. Key insights: 3-4 unique angles or contrarian perspectives

Respond in JSON format:
{
  "research": ["fact 1", "fact 2", ...],
  "insights": ["insight 1", "insight 2", ...]
}`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}\nAngle: ${angle || 'General exploration'}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            return NextResponse.json({ deep_dive: result });

        } else if (action === 'outline') {
            // Step 2: Generate post outline
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a content strategist creating a LinkedIn post outline.
Given a topic and research, create a 5-section outline for a compelling post.
Each section should be a ONE-LINE description of what to write.

IMPORTANT: Return ONLY a JSON array of strings, like this:
["Opening hook sentence", "Main point 1", "Main point 2", "Main point 3", "Closing CTA"]

Do NOT return an object. Return a plain array.`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}\nAngle: ${angle || 'General'}\n\nResearch:\n${deep_dive?.research?.join('\n') || 'None'}\n\nInsights:\n${deep_dive?.insights?.join('\n') || 'None'}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');

            // Ensure we extract sections as array of strings
            let sections: string[] = [];
            if (Array.isArray(result)) {
                sections = result.map((s: any) => typeof s === 'string' ? s : String(s));
            } else if (result.sections && Array.isArray(result.sections)) {
                sections = result.sections.map((s: any) => typeof s === 'string' ? s : String(s));
            } else if (typeof result === 'object') {
                // Handle case where AI returns {key: value} format
                sections = Object.entries(result).map(([k, v]) => `${k}: ${v}`);
            }

            return NextResponse.json({ outline: { sections } });

        } else if (action === 'draft') {
            // Step 3: Generate full draft from outline
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert LinkedIn content writer.
Write a compelling LinkedIn post based on the given outline.
- Use short paragraphs (2-3 sentences max)
- Include line breaks for readability
- Make it personal and authentic
- End with a question or CTA
- Target length: 800-1200 characters`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}\n\nOutline:\n${outline?.join('\n') || 'Write a compelling post'}`
                    }
                ],
            });

            const draft = completion.choices[0].message.content || '';
            return NextResponse.json({ draft });

        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (err: any) {
        console.error('Development API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
