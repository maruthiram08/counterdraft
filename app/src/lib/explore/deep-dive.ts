import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { readPage } from '@/lib/read-page';

// What a story or thread actually says, so a writer can judge it without leaving Explore.

export interface Viewpoint {
    who: string;
    view: string;
}

export interface DeepDive {
    summary: string;
    keyPoints: string[];
    viewpoints: Viewpoint[];
    // What the piece leaves unanswered: room for the writer's own take
    openQuestions: string[];
    // Where the text came from, when it was not the link itself
    readFrom?: string;
}

export interface DeepDiveInput {
    url: string;
    title: string;
    query?: string;
    kind?: string;
}

const MIN_TEXT = 600;
const MAX_TEXT = 12000;

function cleanList(value: unknown, max: number): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map(v => v.trim().replace(/\s+/g, ' '))
        .slice(0, max);
}

/** Keeps the parts of the model's answer that have the right shape; null when there is no summary. */
export function parseDeepDive(raw: unknown): DeepDive | null {
    const data = (raw ?? {}) as Record<string, unknown>;
    const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
    if (!summary) return null;

    const viewpoints = (Array.isArray(data.viewpoints) ? data.viewpoints : [])
        .map(v => (v ?? {}) as Record<string, unknown>)
        .filter(v => typeof v.who === 'string' && typeof v.view === 'string' && v.who.trim() && v.view.trim())
        .map(v => ({ who: (v.who as string).trim(), view: (v.view as string).trim() }))
        .slice(0, 4);

    return {
        summary,
        keyPoints: cleanList(data.keyPoints, 5),
        viewpoints,
        openQuestions: cleanList(data.openQuestions, 2),
    };
}

// Google News links are redirect pages, so they never yield the article itself
export function needsSearchFallback(url: string, text: string): boolean {
    try {
        if (new URL(url).hostname === 'news.google.com') return true;
    } catch {
        return true;
    }
    return text.length < MIN_TEXT;
}

// Finds the same story on the open web and reads its full text through Tavily
async function textFromSearch(title: string): Promise<{ text: string; url?: string }> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return { text: '' };
    try {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, query: title.slice(0, 300), search_depth: 'basic', max_results: 3, include_raw_content: true }),
        });
        type Result = { url?: string; content?: string; raw_content?: string | null };
        const data = await res.json() as { results?: Result[] };
        const best = (data.results || []).find(r => (r.raw_content || '').length >= MIN_TEXT) ?? data.results?.[0];
        return { text: (best?.raw_content || best?.content || '').replace(/\s+/g, ' ').trim(), url: best?.url };
    } catch (err) {
        console.error('Deep dive search fallback failed:', err);
        return { text: '' };
    }
}

async function sourceText(url: string, title: string): Promise<{ text: string; readFrom?: string }> {
    let text = '';
    try {
        text = (await readPage(url)).content;
    } catch (err) {
        console.warn('Deep dive could not read the page:', err);
    }
    if (!needsSearchFallback(url, text)) return { text };

    const found = await textFromSearch(title);
    if (found.text.length > text.length) {
        return { text: found.text, readFrom: found.url && found.url !== url ? found.url : undefined };
    }
    return { text };
}

const diveCache = new Map<string, { value: DeepDive; expiresAt: number }>();
const DIVE_TTL_MS = 24 * 60 * 60 * 1000;

export async function buildDeepDive({ url, title, query, kind }: DeepDiveInput): Promise<DeepDive | null> {
    const cached = diveCache.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const { text, readFrom } = await sourceText(url, title);
    if (text.length < 200) return null;

    const isThread = kind === 'question';
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
            {
                role: 'system',
                content: `You brief a writer on ${isThread ? 'a community discussion' : 'a piece of content'} so they can decide what to write about it without reading it all.
Use only what the text says. Never add facts, numbers or names that are not in it. If the text is mostly navigation, ads or unrelated, return { "summary": "" }.
Return JSON:
{
  "summary": "${isThread ? '2-3 sentences: what the person asked, their situation, and where the discussion landed' : '2-3 sentences: what this is and what it concludes'}",
  "keyPoints": ["3-5 ${isThread ? 'concrete suggestions or experiences from the replies' : 'concrete facts, numbers, steps or examples from the text'}, one sentence each"],
  "viewpoints": [{ "who": "who holds it, 2-5 words (a named person, a group, or 'Some replies')", "view": "their position in one sentence" }],
  "openQuestions": ["1-2 questions the text raises but does not answer, that a writer could take on"]
}
Give 2-4 viewpoints only when the text shows different positions; otherwise give an empty list.${query ? `\nThe writer is exploring "${query}": favour points that matter for that.` : ''}`,
            },
            { role: 'user', content: `Title: ${title}\n\nText:\n${text.slice(0, MAX_TEXT)}` },
        ],
    });

    const dive = parseDeepDive(JSON.parse(completion.choices[0].message.content || '{}'));
    TraceLogger.log('explore', 'Deep dive', { url, chars: text.length, readFrom, ok: Boolean(dive) });
    if (!dive) return null;

    const value = readFrom ? { ...dive, readFrom } : dive;
    diveCache.set(url, { value, expiresAt: Date.now() + DIVE_TTL_MS });
    return value;
}
