import { NextResponse } from 'next/server';
import { TraceLogger } from '@/lib/trace';
import { moderateContent, getModerationErrorMessage } from '@/lib/moderation';
import { openai, SAFETY_PREAMBLE } from '@/lib/openai';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

        // 0. Rate Limiting
        const ip = getClientIp(req);
        const limitResult = rateLimit(`explore-ideas:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
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

        // What the writer searched for is the topic; the stories they picked are the material for it
        const search = typeof body.context === 'string' ? body.context.trim().slice(0, 300) : '';
        type SourceInput = { title?: unknown; summary?: unknown; takeaway?: unknown };
        const sources: SourceInput[] = Array.isArray(body.sources) ? body.sources.slice(0, 6) : [];
        const material = sources
            .filter(src => typeof src.title === 'string')
            .map(src => [
                `- ${src.title}`,
                typeof src.takeaway === 'string' && src.takeaway ? `  Takeaway: ${src.takeaway.slice(0, 300)}` : '',
                typeof src.summary === 'string' && src.summary ? `  Snippet: ${src.summary.slice(0, 400)}` : '',
            ].filter(Boolean).join('\n'))
            .join('\n');
        const userMessage = search
            ? `The writer is exploring: "${search}"
Every idea must be about that, as they framed it. Use the material below as evidence, examples or a starting point, not as a new topic.

Material they picked:
${material || subject}`
            : `Generate ${count} post ideas about: "${subject}"`;

        const writerContext = await getWriterContext(userId, body.relatedBeliefIds);

        const platformDesc = PLATFORM_GUIDANCE[platform] || PLATFORM_GUIDANCE.linkedin;
        const toneDesc = TONE_GUIDANCE[tone] || TONE_GUIDANCE.provocative;

        const systemPrompt = `${SAFETY_PREAMBLE}

You are an editorial content strategist helping a creator turn a trending topic into strong, differentiated post ideas for ${platformDesc}.

You are given:
- The topic the writer is exploring, and material (articles, guides, case studies) they picked for it
- Optional audience context (who they are and what they care about)
- Tone guidance: ${toneDesc}
${writerContext ? `- What the writer believes and how they write:\n${writerContext}\n` : ''}
Your task is to generate up to ${count} post ideas that are worth writing — not just reacting.

Each post idea must:
- Take a clear position or reveal a tension (not a neutral summary)
- Be framed around a real audience question, pain point, or overlooked angle
- Go beyond what is already being widely said about the topic
- Be appropriate for ${platformDesc} in tone and structure

For each idea, include:
- "hook": an opening line or framing that would stop the right reader
- "angle": the specific point of view, argument, or tension the post would explore
- "format": a short name (2-4 words) for the structure that best carries this angle on ${platformDesc}

Formats are open: choose whatever fits the angle best, not a fixed menu. Possibilities include a personal story, contrarian take, data breakdown, framework, step-by-step how-to, myth vs reality, case study, before/after, prediction, lessons learned, carousel, poll, thread, open question or a short list, and anything else that suits the idea. Give every idea a different format.

If writer context is given, match their voice, and where one of their beliefs genuinely bears on the topic, build from where they stand: agree with, push back on, or add nuance to it. Only use a belief when the connection is real and specific; most topics touch none of them, and stretching an unrelated belief to fit makes the idea worse. Never invent beliefs they did not state.

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
Only if an idea genuinely draws on one of the writer's beliefs, add "belief" with that belief's statement, copied exactly. Otherwise leave "belief" out.

Think like an editor helping a creator stand out during a noisy moment — not an AI generating trend content.
`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
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
    } catch (err: unknown) {
        console.error('Post Ideas API Error:', err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: 'Failed to generate ideas', details: message }, { status: 500 });
    }
}

// The writer's own beliefs and active voice, so ideas start from where they stand.
async function getWriterContext(userId: string, relatedBeliefIds: unknown): Promise<string> {
    const ids = Array.isArray(relatedBeliefIds)
        ? relatedBeliefIds.filter((id): id is string => typeof id === 'string').slice(0, 5)
        : [];

    const [related, core, voice] = await Promise.all([
        ids.length > 0
            ? supabaseAdmin.from('beliefs').select('statement').eq('user_id', userId).in('id', ids)
            : Promise.resolve({ data: [] as { statement: string }[] }),
        supabaseAdmin
            .from('beliefs')
            .select('statement')
            .eq('user_id', userId)
            .eq('belief_type', 'core')
            .order('confidence', { ascending: false })
            .limit(8),
        supabaseAdmin
            .from('voice_profiles')
            .select('voice_tone, rules, anti_patterns')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle(),
    ]);

    const statements = [...new Set([...(related.data || []), ...(core.data || [])].map(b => b.statement))];
    const lines: string[] = [];
    if (statements.length > 0) {
        lines.push(`Beliefs:\n${statements.map(s => `  - ${s}`).join('\n')}`);
    }
    if (voice.data?.voice_tone) {
        lines.push(`Voice: ${voice.data.voice_tone}`);
    }
    if (voice.data?.rules?.length) {
        lines.push(`Style rules: ${voice.data.rules.slice(0, 5).join('; ')}`);
    }
    if (voice.data?.anti_patterns?.length) {
        lines.push(`Avoid: ${voice.data.anti_patterns.slice(0, 5).join('; ')}`);
    }
    return lines.join('\n');
}
