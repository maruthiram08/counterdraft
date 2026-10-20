import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';

export interface RelatedTopic {
    label: string;
    query: string;
}

const relatedCache = new Map<string, { value: RelatedTopic[]; expiresAt: number }>();
const RELATED_TTL_MS = 60 * 60 * 1000;

/**
 * Suggests neighbouring subtopics for a search so the user can branch out
 * instead of typing a new query each time.
 */
export async function suggestRelatedTopics(query: string, headlines: string[]): Promise<RelatedTopic[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = relatedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0.5,
            messages: [
                {
                    role: 'system',
                    content: `You help a writer discover topics worth writing about.
Given a search and the headlines it returned, suggest 5 related subtopics to explore next.
Mix: narrower angles inside the topic, adjacent topics people discuss alongside it, and one less obvious connection.
Return JSON: { "related": [ { "label": "2-4 word chip label", "query": "2-5 word news search query" } ] }
Rules:
- Labels must be specific (e.g. "Async hiring", not "Work").
- Do not repeat the original search.`,
                },
                {
                    role: 'user',
                    content: `Search: ${query}\nHeadlines:\n${headlines.slice(0, 12).map(h => `- ${h}`).join('\n')}`,
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        const related: RelatedTopic[] = (Array.isArray(parsed.related) ? parsed.related : [])
            .filter((r: RelatedTopic) => r && typeof r.label === 'string' && typeof r.query === 'string')
            .slice(0, 6);

        TraceLogger.log('explore', 'Related topics', { query, related: related.length });
        relatedCache.set(cacheKey, { value: related, expiresAt: Date.now() + RELATED_TTL_MS });
        return related;
    } catch (err) {
        console.error('Related topics failed:', err);
        return [];
    }
}
