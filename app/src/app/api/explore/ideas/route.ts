import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TraceLogger } from '@/lib/trace';
import { moderateContent, getModerationErrorMessage } from '@/lib/moderation';
import { SAFETY_PREAMBLE } from '@/lib/openai';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';

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
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        const limitCheck = await UsageService.checkSearchLimit(userId);
        if (!limitCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Limit Reached',
                    message: limitCheck.reason,
                    tier: limitCheck.tier,
                    upgradeUrl: '/pricing'
                },
                { status: 403 }
            );
        }

        const subject = titles.length > 1
            ? `Multiple topics: ${titles.join('; ')}`
            : titles[0];

        const platformDesc = PLATFORM_GUIDANCE[platform] || PLATFORM_GUIDANCE.linkedin;
        const toneDesc = TONE_GUIDANCE[tone] || TONE_GUIDANCE.provocative;

        const systemPrompt = `${SAFETY_PREAMBLE}

You are an editorial content strategist helping a creator turn a trending topic into strong, differentiated post ideas for ${platformDesc}.

You are given:
- A trending topic or theme
- Optional audience context (who they are and what they care about)
- Tone guidance: ${toneDesc}

Your task is to generate up to ${count} post ideas that are worth writing — not just reacting.

Each post idea must:
- Take a clear position or reveal a tension (not a neutral summary)
- Be framed around a real audience question, pain point, or overlooked angle
- Go beyond what is already being widely said about the topic
- Be appropriate for ${platformDesc} in tone and structure

For each idea, include:
- "hook": an opening line or framing that would stop the right reader
- "angle": the specific point of view, argument, or tension the post would explore
- "format": the structural approach (e.g., short insight, mini-essay, list, narrative, how-to, question-led)

Prioritize ideas that:
- Reframe the trend from an unexpected or under-discussed angle
- Challenge common assumptions or surface tradeoffs
- Help the reader think more clearly, not just stay informed

Avoid:
- Generic trend summaries or explanatory overviews
- Obvious or widely repeated takes
- Engagement bait or sensational framing
- Ideas that could apply to any trend without modification

Quality over quantity: If you cannot find ${count} genuinely differentiated angles, return fewer. Do not pad with weak ideas.

Output format:
Return a JSON object with an "ideas" array.
Each item must include "hook", "angle", and "format".

Think like an editor helping a creator stand out during a noisy moment — not an AI generating trend content.
`;

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

        await UsageService.incrementSearchCount(userId);

        return NextResponse.json({
            ideas: parsed.ideas || [],
            config: { platform, tone, count } // Return config for transparency
        });
    } catch (err: any) {
        console.error('Post Ideas API Error:', err);
        return NextResponse.json({ error: 'Failed to generate ideas', details: err.message }, { status: 500 });
    }
}
