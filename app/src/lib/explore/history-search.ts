import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { parseHistory, type PastPiece, type TopicHistory } from './history';

const MAX_PIECES = 60;
const EXCERPT = 280;

const historyCache = new Map<string, { value: TopicHistory; expiresAt: number }>();
const HISTORY_TTL_MS = 6 * 60 * 60 * 1000;

export async function findTopicHistory(
    userId: string,
    query: string,
    stories: string[],
    pieces: PastPiece[]
): Promise<TopicHistory | null> {
    if (pieces.length === 0) return null;
    const cacheKey = `${userId}:${query.trim().toLowerCase()}`;
    const cached = historyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const list = pieces.slice(0, MAX_PIECES);
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You check a writer's past posts and drafts against a topic they are exploring now.
Find the ONE piece that is genuinely about the same topic (not merely the same broad field). If none is, say so.
If there is one, compare it with today's coverage and say what has changed or is new since, which would make a natural follow-up post.
Return JSON:
{ "match": <index of the piece, or null>, "related": <true if some pieces touch the field even without a match>, "gist": "what their piece argued, one short line", "changed": "what is new in today's coverage since then, one or two sentences, to the writer as 'you'" }`,
            },
            {
                role: 'user',
                content: `Topic now: ${query}

Today's coverage:
${stories.slice(0, 10).map(s => `- ${s}`).join('\n') || '(none)'}

Their pieces:
${list.map((p, i) => `[${i}] ${p.kind}, ${p.date.slice(0, 10)}: ${p.text.replace(/\s+/g, ' ').slice(0, EXCERPT)}`).join('\n')}`,
            },
        ],
    });

    const value = parseHistory(JSON.parse(completion.choices[0].message.content || '{}'), list);
    TraceLogger.log('explore', 'Topic history', { query, pieces: list.length, matched: Boolean(value.before) });
    historyCache.set(cacheKey, { value, expiresAt: Date.now() + HISTORY_TTL_MS });
    return value;
}
