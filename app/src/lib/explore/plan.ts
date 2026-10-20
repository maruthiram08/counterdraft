import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';

// 'learn': the user wants to know how to do something (frameworks, playbooks, case studies, expert takes).
// 'news': the user wants what is happening in a topic right now.
export type SearchIntent = 'learn' | 'news';

export interface SearchPlan {
    intent: SearchIntent;
    // Short name for the search, shown in the exploration path instead of the full sentence
    label: string;
    queries: string[];
}

const LEARN_PATTERN = /\b(how (to|do|does|can|should)|ways to|guide|playbook|framework|frameworks|strategy|strategies|best practices?|case stud(y|ies)|lessons|template|examples?|step[- ]by[- ]step|checklist|tactics|approach(es)?)\b/i;

const FILLER = new Set([
    'how', 'to', 'do', 'does', 'can', 'should', 'i', 'we', 'you', 'a', 'an', 'the', 'for', 'of', 'as', 'in', 'on',
    'and', 'or', 'my', 'our', 'what', 'is', 'are', 'about', 'with', 'into', 'develop', 'build', 'create', 'make',
    'write', 'want', 'know', 'learn', 'show', 'me', 'tell', 'way', 'ways', 'best', 'good',
]);

export function detectIntent(query: string): SearchIntent {
    return LEARN_PATTERN.test(query) ? 'learn' : 'news';
}

/**
 * Plan without the LLM: short queries go as typed, long ones are cut down to their keywords.
 * Used when the planner call fails, and directly for short queries where a call adds nothing.
 */
export function fallbackPlan(query: string): SearchPlan {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    const intent = detectIntent(trimmed);
    const words = trimmed.split(' ');
    if (words.length <= 4) {
        return { intent, label: trimmed, queries: [trimmed] };
    }

    const kept: string[] = [];
    for (const word of words) {
        const bare = word.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!bare || FILLER.has(bare) || kept.some(k => k.toLowerCase() === bare)) continue;
        kept.push(word.replace(/[?.!,]+$/, ''));
    }
    const core = kept.slice(0, 6).join(' ') || trimmed;
    return {
        intent,
        label: kept.slice(0, 4).join(' ') || trimmed,
        queries: intent === 'learn' ? [`${core} framework`, `${core} case study`] : [core],
    };
}

const planCache = new Map<string, { value: SearchPlan; expiresAt: number }>();
const PLAN_TTL_MS = 60 * 60 * 1000;

/**
 * Turns what the user typed into focused web searches. A how-to question such as
 * "How to develop a GTM strategy for a B2C product" becomes searches for frameworks,
 * case studies and practitioner write-ups instead of a news search on its loose keywords.
 */
export async function planSearch(query: string, lens: string): Promise<SearchPlan> {
    const fallback = fallbackPlan(query);
    if (query.trim().split(/\s+/).length <= 3 && lens !== 'beginner') return fallback;

    const cacheKey = `${query.trim().toLowerCase()}:${lens}`;
    const cached = planCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: `You plan web searches for a writer exploring a topic to write about.
Decide the intent:
- "learn": they want to understand how to do something or how something works (how-to questions, strategy, frameworks, playbooks).
- "news": they want what is happening now in a topic (events, launches, debates in the news).
Then write 2 or 3 web search queries that will find the best material for that intent.
For "learn", aim the queries at frameworks, step-by-step playbooks, real company case studies and essays by practitioners. Keep every qualifier that narrows the topic (for example "B2C", "consumer app", "product-led"). Never write a query that only defines a term ("what is X") or compares two terms ("X vs Y").
For "news", aim at recent developments and debates.${lens === 'beginner' ? '\nThe writer is a beginner: favour explainers and common questions.' : ''}
Each query is 3 to 8 words, no quotes, no years.
"label" is a 2 to 5 word name for the search, in the user's own terms.
Return JSON: { "intent": "learn", "label": "B2C go-to-market strategy", "queries": ["..."] }`,
                },
                { role: 'user', content: query },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        const queries = (Array.isArray(parsed.queries) ? parsed.queries : [])
            .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 0)
            .slice(0, 3);
        if (queries.length === 0) return fallback;

        const plan: SearchPlan = {
            intent: parsed.intent === 'news' ? 'news' : parsed.intent === 'learn' ? 'learn' : fallback.intent,
            label: typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label.trim() : fallback.label,
            queries,
        };
        TraceLogger.log('explore', 'Search plan', { query, ...plan });
        planCache.set(cacheKey, { value: plan, expiresAt: Date.now() + PLAN_TTL_MS });
        return plan;
    } catch (err) {
        console.error('Search planning failed:', err);
        return fallback;
    }
}
