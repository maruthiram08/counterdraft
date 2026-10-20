import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import type { BeliefRef, ItemAnnotation, RawFeedItem, ResultKind } from './feed';
import type { SearchIntent } from './plan';

const KINDS: ResultKind[] = ['framework', 'case study', 'expert view', 'data', 'news'];

/**
 * One LLM pass over the results, judged against what the user actually asked: drops anything that
 * doesn't help with it (definitions, glossary pages, tangential news, press releases), labels what
 * kind of material each result is, says in one line what a writer can take from it, and links it
 * to the belief it genuinely bears on. Returns null on failure so the caller can fall back to
 * keyword matching.
 */
export async function annotateItems(
    request: string,
    intent: SearchIntent,
    items: RawFeedItem[],
    beliefs: BeliefRef[]
): Promise<ItemAnnotation[] | null> {
    const beliefList = beliefs.slice(0, 40);
    const relevanceRule = intent === 'learn'
        ? `"relevant": true only if the result directly helps answer the request as asked, with every qualifier in it (for example a B2C request needs B2C or consumer material). Good results are frameworks, step-by-step playbooks, real company case studies, practitioner essays and data. False for: pages that only define a term or compare two terms ("What is B2C marketing", "B2B vs B2C"), generic sales or marketing explainers that don't address the request, vendor glossary or SEO pages, news about a company or event that merely mentions the topic, conference or interview coverage without a usable lesson, and press releases.`
        : `"relevant": true if it gives someone interested in the request a real topic, debate or insight to write about. False for routine announcements (executive hires, appointments, funding or earnings notices, press releases), job listings, and stories that only share words with the request.`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `You screen search results for a writer looking for something to write about. Be strict: it is better to return few results than weak ones.
For each result decide:
- ${relevanceRule}
- "kind": one of ${KINDS.map(k => `"${k}"`).join(', ')}.
- "takeaway": for relevant results, one sentence (max 25 words) on the specific idea, lesson or number a writer could use from it. Not a summary of the page. Null when not relevant.
- "belief": the number of the writer's belief that the result directly supports or challenges, or null. Only pick a belief when the connection is clear and specific; sharing a word is not enough. Most results have none.
- "stance": "supports" or "challenges" when a belief is picked, else null.
Return JSON: { "items": [ { "i": 0, "relevant": true, "kind": "framework", "takeaway": "...", "belief": null, "stance": null } ] } with one entry per result, in order.`,
                },
                {
                    role: 'user',
                    content: [
                        `Request: ${request}`,
                        'Results:',
                        ...items.map((item, i) => `${i}. ${item.title} [${item.source}]${item.summary ? ` (${item.summary.slice(0, 220)})` : ''}`),
                        'Writer beliefs:',
                        ...(beliefList.length > 0 ? beliefList.map((b, i) => `${i}. ${b.statement}`) : ['(none)']),
                    ].join('\n'),
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        if (!Array.isArray(parsed.items)) return null;

        // A result the model skipped is treated as not relevant, since the screen is meant to be strict
        const annotations: ItemAnnotation[] = items.map(() => ({ relevant: false, beliefId: null, stance: null }));
        for (const entry of parsed.items) {
            if (typeof entry?.i !== 'number' || !annotations[entry.i]) continue;
            const belief = typeof entry.belief === 'number' ? beliefList[entry.belief] : undefined;
            annotations[entry.i] = {
                relevant: entry.relevant === true,
                beliefId: belief?.id ?? null,
                stance: belief && (entry.stance === 'supports' || entry.stance === 'challenges') ? entry.stance : null,
                kind: KINDS.includes(entry.kind) ? entry.kind : undefined,
                takeaway: typeof entry.takeaway === 'string' && entry.takeaway.trim() ? entry.takeaway.trim() : undefined,
            };
        }

        TraceLogger.log('explore', 'Annotated results', {
            request,
            intent,
            relevant: annotations.filter(a => a.relevant).length,
            matched: annotations.filter(a => a.beliefId).length,
        });
        return annotations;
    } catch (err) {
        console.error('Annotating results failed:', err);
        return null;
    }
}
