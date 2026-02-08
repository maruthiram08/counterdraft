
import { openai } from '../openai';
import { TraceLogger } from '../trace';
import type { IdeaGenerationResult } from '@/types';

const refineQueryCache = new Map<string, { value: string[]; expiresAt: number }>();
const REFINE_QUERY_TTL_MS = 24 * 60 * 60 * 1000;

// Helper for idea generation
export async function generateIdeas(
    beliefs: { statement: string; type: string }[],
    tensions: { summary: string; beliefA: string; beliefB: string }[]
): Promise<IdeaGenerationResult> {
    const beliefContext = beliefs.map(b => `[${b.type}] ${b.statement}`).join('\n');
    const tensionContext = tensions.map(t =>
        `TENSION: "${t.beliefA}" vs "${t.beliefB}" - ${t.summary}`
    ).join('\n');

    const systemPrompt = `You are helping a creator decide what to write about next.
Given their belief graph and detected tensions, suggest 3 idea directions.

Focus on:
- Underexplored themes they haven't covered enough
- Tensions that would benefit from public exploration
- Beliefs that could be strengthened with fresh angles

Output as JSON matching this schema:
{
  "ideas": [
    {
      "theme": "high-level theme",
      "topic": "specific topic to write about",
      "strengthensBelief": "which belief this reinforces",
      "exploresTension": "optional - which tension this explores",
      "risksWeakening": "optional - which belief might be weakened",
      "openingLine": "suggested opening line",
      "rationale": "why this is worth writing"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Creator's beliefs:\n${beliefContext}\n\nDetected tensions:\n${tensionContext}\n\nSuggest 3 idea directions.` }
        ],
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.8 // Higher entropy for Brainstorming
    });

    const result = completion.choices[0].message.content;
    if (!result) throw new Error("No response from OpenAI");

    return JSON.parse(result) as IdeaGenerationResult;
}

// Helper for outcome inference
export async function inferOutcomeWithLLM(
    topic: string,
    audience?: { role: string; pain: string }
): Promise<{ outcome: string; reasoning: string }> {
    const audienceContext = audience
        ? `Audience Role: ${audience.role}\nAudience Pain: ${audience.pain}`
        : "Audience: General professional audience";

    const systemPrompt = `You are an expert content strategist.
Given a topic and optional audience, determine the best "Outcome" for this piece of content.

Outcomes:
- authority: distinct point of view, thought leadership, teaching a concept.
- engagement: relatable, viral potential, asking questions, storytelling.
- conversion: selling a product/service, driving signup, clear CTA.
- connection: vulnerable, personal story, building trust.

Output as JSON: { "outcome": "authority|engagement|conversion|connection", "reasoning": "..." }`;

    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Topic: ${topic}\n${audienceContext}` }
        ],
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.3 // Lower temp for classification
    });

    const result = completion.choices[0].message.content;
    if (!result) throw new Error("No response from OpenAI");

    return JSON.parse(result);
}

// Helper for tag suggestion
export async function suggestTags(content: string): Promise<string[]> {
    const systemPrompt = `You are a social media expert.
Analyze the content and suggest 5-8 high-impact, relevant hashtags or context labels.
Mix broad niche tags (e.g. #Leadership) with specific tags (e.g. #RemoteWorkTips).

Output as JSON: { "tags": ["#tag1", "#tag2", ...] }`;

    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Content:\n${content.substring(0, 1000)}...` } // Limit context window
        ],
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.7
    });

    const result = completion.choices[0].message.content;
    if (!result) return [];

    try {
        const parsed = JSON.parse(result);
        return parsed.tags || [];
    } catch {
        return [];
    }
}

/**
 * Refines a user's natural language search request into optimized Google News queries.
 */
export async function refineSearchQuery(userInput: string, lens?: string): Promise<string[]> {
    const cacheKey = `${userInput.trim().toLowerCase()}:${lens || 'default'}`;
    const cached = refineQueryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const systemPrompt = `
You are an intellectual query designer for a research-driven content exploration tool.

Current Lens: ${lens === 'beginner' ? 'BEGINNER (Focus on basic questions, "how-tos", and forum-style curiosity)' : 'PROFESSIONAL (Focus on emerging debates and unresolved questions)'}

The user will input a natural-language request describing a topic they want to explore.
Your job is to generate 1–3 high-quality Google News search queries.

${lens === 'beginner'
            ? `For the BEGINNER lens, prioritize surfacing:
- "How to" and "Why is X" questions
- Common confusion points or beginner hurdles
- Reddit, Quora, or forum-style inquiries
- Explainer-style content`
            : `For the PROFESSIONAL lens, prioritize surfacing:
- emerging debates
- unresolved questions
- conflicting viewpoints
- second-order implications`}

Rules:
- Return ONLY a JSON object with a "queries" array of strings.
- Each query must be 2–5 words.
- Queries must be specific and intellectually generative.
${lens === 'beginner'
            ? '- Use phrasing that triggers forum/QA results (e.g., "is X worth it reddit")'
            : '- Prefer angles that reveal tension, disagreement, or change.'}

Hard constraints:
- Do NOT include words like: "latest", "breaking", "today", "top", "update".
- Do NOT include conversational filler (e.g., "show me", "I want to know").
- Do NOT generate near-duplicate queries.
  `;

    try {
        TraceLogger.log('openai', 'refineSearchQuery: Input', userInput);

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userInput }
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0.3, // Low temperature for deterministic results
        });

        const result = completion.choices[0].message.content;
        TraceLogger.log('openai', 'refineSearchQuery: Output', result);

        if (!result) return [userInput];

        const parsed = JSON.parse(result);
        const queries = parsed.queries || [userInput];
        refineQueryCache.set(cacheKey, { value: queries, expiresAt: Date.now() + REFINE_QUERY_TTL_MS });
        return queries;

    } catch (error) {
        console.error("Query refinement failed:", error);
        return [userInput]; // Fallback to original
    }
}
