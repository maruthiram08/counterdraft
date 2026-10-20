import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import type { BeliefRef, RawFeedItem } from './feed';

export interface Annotation {
    relevant: boolean;
    beliefId: string | null;
    stance: 'supports' | 'challenges' | null;
}

/**
 * One LLM pass over the results: drops stories that give a writer nothing to say about the search
 * (routine hires, press releases, unrelated uses of the words) and links each story to the belief
 * it genuinely bears on. Returns null on failure so the caller can fall back to keyword matching.
 */
export async function annotateItems(
    query: string,
    items: RawFeedItem[],
    beliefs: BeliefRef[]
): Promise<Annotation[] | null> {
    const beliefList = beliefs.slice(0, 40);

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `You screen news results for a writer looking for topics to write about.
For each story decide:
- "relevant": true if it gives someone interested in the search a real topic, debate or insight to write about. False for routine announcements (executive hires, appointments, funding or earnings notices, press releases), job listings, and stories that only share words with the search.
- "belief": the number of the writer's belief that the story directly supports or challenges, or null. Only pick a belief when the connection is clear and specific; sharing a word is not enough. Most stories have none.
- "stance": "supports" or "challenges" when a belief is picked, else null.
Return JSON: { "items": [ { "i": 0, "relevant": true, "belief": null, "stance": null } ] } with one entry per story, in order.`,
                },
                {
                    role: 'user',
                    content: [
                        `Search: ${query}`,
                        'Stories:',
                        ...items.map((item, i) => `${i}. ${item.title}${item.summary ? ` (${item.summary.slice(0, 160)})` : ''}`),
                        'Writer beliefs:',
                        ...(beliefList.length > 0 ? beliefList.map((b, i) => `${i}. ${b.statement}`) : ['(none)']),
                    ].join('\n'),
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        if (!Array.isArray(parsed.items)) return null;

        const annotations: Annotation[] = items.map(() => ({ relevant: true, beliefId: null, stance: null }));
        for (const entry of parsed.items) {
            if (typeof entry?.i !== 'number' || !annotations[entry.i]) continue;
            const belief = typeof entry.belief === 'number' ? beliefList[entry.belief] : undefined;
            annotations[entry.i] = {
                relevant: entry.relevant !== false,
                beliefId: belief?.id ?? null,
                stance: belief && (entry.stance === 'supports' || entry.stance === 'challenges') ? entry.stance : null,
            };
        }

        TraceLogger.log('explore', 'Annotated results', {
            query,
            relevant: annotations.filter(a => a.relevant).length,
            matched: annotations.filter(a => a.beliefId).length,
        });
        return annotations;
    } catch (err) {
        console.error('Annotating results failed:', err);
        return null;
    }
}
