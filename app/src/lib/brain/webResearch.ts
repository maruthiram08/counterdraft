import { BrainMetadata } from '@/types';
import { originAngle, originQuery } from './strategy';

export interface WebSource {
    title: string;
    url: string;
    content: string;
}

// Fallback search queries when the planner call fails: aim at where the topic meets the brief
export function fallbackQueries(hook: string, meta?: Partial<BrainMetadata>, angle?: string): string[] {
    const audience = meta?.audience?.role;
    const pain = meta?.audience?.pain;
    const origin = originQuery(meta);
    const savedAngle = originAngle(angle, meta);
    const queries = [
        audience && pain ? `${audience} ${pain}` : '',
        origin && audience ? `${origin} ${audience}` : origin || '',
        origin && savedAngle ? `${origin} ${savedAngle}` : '',
        audience ? `${hook} for ${audience}` : hook,
        meta?.brief?.trim().slice(0, 200) || '',
    ];
    return [...new Set(queries.map(q => q.trim()).filter(Boolean))].slice(0, 3);
}

// Every search must stay on the brief's audience: append it to any planned query that drifted to the general topic
// and to the place the brief is about (e.g. India), which the planner names
export function anchorQueries(queries: string[], meta?: Partial<BrainMetadata>, place?: string): string[] {
    const audience = meta?.audience?.role?.trim();
    const mentions = (q: string, term: string) => {
        const words = term.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
        return !words.length || words.some(w => q.toLowerCase().includes(w.replace(/s$/, '')));
    };
    return queries.map(q => {
        let anchored = audience && !mentions(q, audience) ? `${q} ${audience}` : q;
        if (place && !mentions(anchored, place)) anchored = `${anchored} ${place}`;
        return anchored;
    });
}

// `country` boosts results from that country (Tavily's lowercase country names); a rejected value falls back to a plain search
export async function searchWeb(query: string, maxResults = 5, country?: string): Promise<WebSource[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    try {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, query, topic: 'general', search_depth: 'advanced', max_results: maxResults, ...(country ? { country } : {}) }),
        });
        if (!res.ok) return country ? searchWeb(query, maxResults) : [];
        const data = await res.json() as { results?: { title?: string; url?: string; content?: string }[] };
        return (data.results || [])
            .filter(r => r.title && r.url && r.content)
            .map(r => ({ title: r.title!, url: r.url!, content: r.content!.slice(0, 800) }));
    } catch (err) {
        console.error(`Web research failed for "${query}":`, err);
        return [];
    }
}

// Runs the queries in parallel and drops duplicate URLs, keeping at most `limit` sources
export async function gatherWebSources(queries: string[], limit = 12, country?: string): Promise<WebSource[]> {
    const results = await Promise.all(queries.map(q => searchWeb(q, 5, country)));
    const seen = new Set<string>();
    const sources: WebSource[] = [];
    for (const source of results.flat()) {
        if (seen.has(source.url)) continue;
        seen.add(source.url);
        sources.push(source);
        if (sources.length >= limit) break;
    }
    return sources;
}

export function formatWebSources(sources: WebSource[]): string {
    if (!sources.length) return '';
    const list = sources.map((s, i) => {
        let domain = s.url;
        try { domain = new URL(s.url).hostname.replace(/^www\./, ''); } catch { /* keep url */ }
        return `[${i + 1}] ${s.title} (${domain})\nURL: ${s.url}\n${s.content}`;
    }).join('\n\n');
    return `\n\nWEB SOURCES (found for this post; cite them):\n${list}`;
}
