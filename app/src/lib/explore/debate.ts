import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';

// The takes a topic's coverage already makes, and the one nobody is making yet.

export interface DebateStory {
    title: string;
    summary?: string;
    source?: string;
}

export interface Take {
    take: string;
    // Indexes into the stories that make this take
    stories: number[];
}

export interface Debate {
    takes: Take[];
    gap: { take: string; why: string } | null;
}

/** Keeps takes that point at real stories, most-covered first; null when there is nothing to show. */
export function parseDebate(raw: unknown, storyCount: number): Debate | null {
    const data = (raw ?? {}) as Record<string, unknown>;
    const takes: Take[] = (Array.isArray(data.takes) ? data.takes : [])
        .map(t => (t ?? {}) as Record<string, unknown>)
        .filter(t => typeof t.take === 'string' && t.take.trim())
        .map(t => ({
            take: (t.take as string).trim(),
            stories: [...new Set((Array.isArray(t.stories) ? t.stories : [])
                .filter((i): i is number => Number.isInteger(i) && i >= 0 && i < storyCount))],
        }))
        .filter(t => t.stories.length > 0)
        .sort((a, b) => b.stories.length - a.stories.length)
        .slice(0, 4);

    const g = (data.gap ?? {}) as Record<string, unknown>;
    const gap = typeof g.take === 'string' && g.take.trim()
        ? { take: g.take.trim(), why: typeof g.why === 'string' ? g.why.trim() : '' }
        : null;

    if (takes.length < 2 && !gap) return null;
    return { takes, gap };
}

const debateCache = new Map<string, { value: Debate | null; expiresAt: number }>();
const DEBATE_TTL_MS = 6 * 60 * 60 * 1000;

export async function mapDebate(query: string, stories: DebateStory[]): Promise<Debate | null> {
    const list = stories.slice(0, 15);
    if (list.length < 3) return null;

    const cacheKey = `${query.trim().toLowerCase()}|${list.map(s => s.title).join('|')}`;
    const cached = debateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
            {
                role: 'system',
                content: `You map the conversation around a topic for a writer looking for an angle nobody has taken.
You get the stories a search found. Group them by the position or claim they make about the topic.
Return JSON:
{
  "takes": [{ "take": "the shared position, one plain sentence, under 15 words", "stories": [indexes of the stories that make it] }],
  "gap": { "take": "a credible position or question about this topic that none of these stories takes, one sentence", "why": "one sentence on why it is missing or why it matters" }
}
Rules:
- 2 to 4 takes, each made by at least one story. A take is a claim ("AI tutors widen the gap between rich and poor schools"), not a subject ("AI in education").
- The gap must be specific to this topic and defensible, not a generic "the human side" or "ethics". It can be contrarian, a neglected group, a second-order effect or an unasked question.
- Use only what the stories say for the takes.`,
            },
            {
                role: 'user',
                content: `Topic: ${query}\n\nStories:\n${list.map((s, i) => `[${i}] ${s.title}${s.source ? ` (${s.source})` : ''}${s.summary ? `\n    ${s.summary.slice(0, 300)}` : ''}`).join('\n')}`,
            },
        ],
    });

    const debate = parseDebate(JSON.parse(completion.choices[0].message.content || '{}'), list.length);
    TraceLogger.log('explore', 'Debate map', { query, stories: list.length, takes: debate?.takes.length ?? 0, gap: Boolean(debate?.gap) });
    debateCache.set(cacheKey, { value: debate, expiresAt: Date.now() + DEBATE_TTL_MS });
    return debate;
}
