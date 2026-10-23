import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { trimSnippet } from './feed';

// Questions real people ask about a topic, found in community threads rather than news.

export interface AudienceQuestion {
    question: string;
    theme: string;
    url: string;
    source: string;
    // What the asker wrote around the question, from the thread itself
    detail?: string;
}

export interface CommunityResult {
    title: string;
    url: string;
    content?: string;
}

// Where people ask each other things in public
export const QUESTION_DOMAINS = ['reddit.com', 'quora.com', 'news.ycombinator.com', 'stackexchange.com', 'indiehackers.com'];

const SOURCE_NAMES: [RegExp, string][] = [
    [/(^|\.)reddit\.com$/, 'Reddit'],
    [/(^|\.)quora\.com$/, 'Quora'],
    [/^news\.ycombinator\.com$/, 'Hacker News'],
    [/(^|\.)stackexchange\.com$/, 'Stack Exchange'],
    [/(^|\.)indiehackers\.com$/, 'Indie Hackers'],
];

const MAX_QUESTIONS = 8;
const QUESTION_START = /^(how|why|what|which|who|when|where|is|are|do|does|did|can|could|should|would|will|has|have|any|anyone)\b/i;

export function sourceName(url: string): string {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return SOURCE_NAMES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
    } catch {
        return 'Community';
    }
}

/** Strips the site furniture community titles carry: "r/startups on Reddit: ...", "... - Quora", "... | Hacker News". */
export function cleanTitle(title: string): string {
    return title
        .replace(/^r\/[\w-]+\s*(on Reddit)?\s*[:\-–]\s*/i, '')
        .replace(/^Reddit\s*[-–:]\s*/i, '')
        .replace(/\s*[-|–:]\s*(r\/[\w-]+|Reddit|Quora|Hacker News|Stack Exchange|Indie Hackers)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isQuestion(text: string): boolean {
    return /\?\s*$/.test(text) || QUESTION_START.test(text);
}

/** One search as typed, one aimed at people asking for help with it. */
export function questionSearches(query: string): string[] {
    const q = query.trim().replace(/\s+/g, ' ').replace(/[?.!]+$/, '');
    return [q, `${q} advice questions`];
}

/**
 * Keeps only questions that point at a thread the search actually returned,
 * one per thread, without repeats, so nothing shown is invented.
 */
export function parseQuestions(raw: unknown, results: CommunityResult[]): AudienceQuestion[] {
    const byUrl = new Map(results.map(r => [r.url, r]));
    const list = Array.isArray((raw as { questions?: unknown })?.questions) ? (raw as { questions: unknown[] }).questions : [];
    const seenUrls = new Set<string>();
    const seenText = new Set<string>();
    const kept: AudienceQuestion[] = [];

    for (const item of list) {
        const { question, theme, url } = (item ?? {}) as Record<string, unknown>;
        if (typeof question !== 'string' || typeof url !== 'string') continue;
        const result = byUrl.get(url);
        const text = question.trim().replace(/\s+/g, ' ');
        const textKey = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        if (!result || !text || seenUrls.has(url) || seenText.has(textKey)) continue;

        seenUrls.add(url);
        seenText.add(textKey);
        kept.push({
            question: /\?$/.test(text) ? text : `${text.replace(/[.!]+$/, '')}?`,
            theme: typeof theme === 'string' && theme.trim() ? theme.trim() : 'Asked online',
            url,
            source: sourceName(url),
            detail: result.content ? trimSnippet(result.content) : undefined,
        });
        if (kept.length >= MAX_QUESTIONS) break;
    }
    return kept;
}

/** Without the LLM: threads whose title is itself a question. */
export function questionsFromTitles(results: CommunityResult[]): AudienceQuestion[] {
    return parseQuestions({
        questions: results
            .map(r => ({ question: cleanTitle(r.title), url: r.url, theme: 'Asked online' }))
            .filter(q => isQuestion(q.question)),
    }, results);
}

async function searchCommunities(query: string): Promise<CommunityResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    try {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                topic: 'general',
                search_depth: 'basic',
                include_domains: QUESTION_DOMAINS,
                max_results: 10,
            }),
            next: { revalidate: 3600 },
        });
        const data = await res.json() as { results?: CommunityResult[] };
        return (data.results || []).filter(r => r.title && r.url);
    } catch (err) {
        console.error(`Community search failed for "${query}":`, err);
        return [];
    }
}

const questionCache = new Map<string, { value: AudienceQuestion[]; expiresAt: number }>();
const QUESTION_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Finds what people are asking about a topic on Reddit, Quora, Hacker News and similar,
 * grouped into a few themes. Every question links to the thread it came from.
 */
export async function findAudienceQuestions(query: string): Promise<AudienceQuestion[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = questionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const batches = await Promise.all(questionSearches(query).map(searchCommunities));
    const seen = new Set<string>();
    const results = batches.flat().filter(r => !seen.has(r.url) && seen.add(r.url)).slice(0, 16);
    if (results.length === 0) return [];

    let questions: AudienceQuestion[];
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: `You find the questions real people are asking about a topic, for a writer deciding what to write.
You get community threads (Reddit, Quora, Hacker News and similar). For each thread where a person is genuinely asking something related to the topic, give the question they are asking.
Rules:
- Use only questions actually asked in that thread's title or text. Rephrase lightly so it reads as one clear question, keeping the asker's specifics (their role, market, numbers, situation).
- Skip threads that are not someone asking (announcements, link posts, promotion) and questions unrelated to the topic.
- At most one question per thread, at most ${MAX_QUESTIONS} in all, the most specific and useful first.
- "theme" groups similar questions: 2 to 4 words, the same wording for questions in the same group, 2 to 4 groups in all.
- "url" is copied exactly from the thread.
Return JSON: { "questions": [ { "question": "...?", "theme": "...", "url": "..." } ] }`,
                },
                {
                    role: 'user',
                    content: `Topic: ${query}\n\nThreads:\n${results.map(r => `- url: ${r.url}\n  title: ${r.title}\n  text: ${(r.content || '').slice(0, 400).replace(/\s+/g, ' ')}`).join('\n')}`,
                },
            ],
        });
        questions = parseQuestions(JSON.parse(completion.choices[0].message.content || '{}'), results);
    } catch (err) {
        console.error('Question extraction failed:', err);
        questions = questionsFromTitles(results);
    }

    TraceLogger.log('explore', 'Audience questions', { query, threads: results.length, questions: questions.length });
    questionCache.set(cacheKey, { value: questions, expiresAt: Date.now() + QUESTION_TTL_MS });
    return questions;
}
