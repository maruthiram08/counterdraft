import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TraceLogger } from '@/lib/trace';
import { moderateContent, getModerationErrorMessage } from '@/lib/moderation';
import { SAFETY_PREAMBLE } from '@/lib/openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Platform-specific guidance
const PLATFORM_GUIDANCE: Record<string, string> = {
    linkedin: "LinkedIn posts (professional, thought leadership, networking-focused)",
    twitter: "Twitter/X posts (concise, punchy, thread-worthy, maximum engagement)",
    newsletter: "Newsletter articles (deeper analysis, personal voice, subscriber value)",
    blog: "Blog posts (SEO-friendly, comprehensive, educational)",
    medium: "Medium articles (storytelling, personal essays, long-form insights)",
};

// Tone-specific guidance
const TONE_GUIDANCE: Record<string, string> = {
    provocative: "Be provocative and interesting. Challenge conventional wisdom. Take bold stances.",
    educational: "Be informative and helpful. Focus on teaching and explaining. Use clear examples.",
    balanced: "Be thoughtful and nuanced. Present multiple perspectives. Avoid extremes.",
    storytelling: "Use narrative techniques. Start with a personal anecdote. Make it relatable.",
};

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // P3: Extract personalization params with defaults
        const platform = body.platform || 'linkedin';
        const tone = body.tone || 'provocative';
        const count = Math.min(Math.max(body.count || 3, 1), 10); // Clamp between 1-10

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

        // 🛡️ CONTENT MODERATION CHECK
        const inputText = titles.join(' ');
        const modResult = await moderateContent(inputText);
        if (modResult.flagged) {
            return NextResponse.json({
                error: getModerationErrorMessage(modResult),
                flagged: true,
                categories: modResult.categories
            }, { status: 400 });
        }

        const subject = titles.length > 1
            ? `Multiple topics: ${titles.join('; ')}`
            : titles[0];

        const platformDesc = PLATFORM_GUIDANCE[platform] || PLATFORM_GUIDANCE.linkedin;
        const toneDesc = TONE_GUIDANCE[tone] || TONE_GUIDANCE.provocative;

        const systemPrompt = `${SAFETY_PREAMBLE}

You are a content strategist helping a thought leader create ${platformDesc}.
Given a trending topic, suggest ${count} compelling post ideas. Each idea should have:
- A hook (attention-grabbing opening line)
- An angle (the unique perspective or argument)
- A format suggestion (story, listicle, hot take, question, etc.)

TONE: ${toneDesc}

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
                { role: "user", content: `Generate ${count} post ideas about: "${subject}"${body.context ? `\n\nContext/User Intent: "${body.context}"` : ''}` }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
        });

        const result = completion.choices[0].message.content;
        TraceLogger.log('explore', 'Generated Ideas', { platform, tone, count, result });

        if (!result) throw new Error("No response from OpenAI");

        const parsed = JSON.parse(result);

        return NextResponse.json({
            ideas: parsed.ideas || [],
            config: { platform, tone, count } // Return config for transparency
        });
    } catch (err: any) {
        console.error('Post Ideas API Error:', err);
        return NextResponse.json({ error: 'Failed to generate ideas', details: err.message }, { status: 500 });
    }
}
