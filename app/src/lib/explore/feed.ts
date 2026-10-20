// Pure helpers for the Explore feed: RSS parsing, de-duplication, belief matching and ranking.

export interface RawFeedItem {
    title: string;
    link: string;
    source: string;
    pubDate?: string;
    summary?: string;
    // Other outlets covering the same story (Google News clusters them in the description)
    otherSources: string[];
    query: string;
}

export interface BeliefRef {
    id: string;
    statement: string;
}

export interface FeedEntry {
    title: string;
    sourceUrl: string;
    source: string;
    category: string;
    publishedAt?: string;
    summary?: string;
    sourceCount: number;
    otherSources: string[];
    relatabilityScore: number;
    relatedBeliefId: string | null;
    relatedBelief: string | null;
    type: 'article' | 'question';
}

const ENTITIES: Record<string, string> = {
    '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

export function decodeEntities(text: string): string {
    return text
        .replace(/&(lt|gt|quot|#39|apos|nbsp);/g, m => ENTITIES[m] ?? m)
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&amp;/g, '&');
}

function stripCdata(text: string): string {
    return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Google News appends " - Outlet" to every title; drop it since the outlet is shown separately.
export function cleanTitle(title: string, source: string): string {
    const suffix = ` - ${source}`;
    return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title.trim();
}

export function parseGoogleNewsRss(xml: string, query: string, limit = 8): RawFeedItem[] {
    const items: RawFeedItem[] = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const itemXml of itemMatches.slice(0, limit)) {
        const field = (tag: string) => itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
        const source = decodeEntities(stripCdata(field('source') || '')) || 'Google News';
        const rawTitle = decodeEntities(stripCdata(field('title') || ''));
        const link = stripCdata(field('link') || '').trim();
        if (!rawTitle || !link) continue;

        // The description is escaped HTML: a single link, or an <ol> of related coverage.
        const description = decodeEntities(stripCdata(field('description') || ''));
        const outlets = [...description.matchAll(/<font[^>]*>([\s\S]*?)<\/font>/g)]
            .map(m => stripTags(m[1]))
            .filter(Boolean);
        const otherSources = [...new Set(outlets.filter(o => o !== source))];

        items.push({
            title: cleanTitle(rawTitle, source),
            link,
            source,
            pubDate: field('pubDate')?.trim(),
            otherSources,
            query,
        });
    }

    return items;
}

export function normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// Merge items that are the same story (same normalized title), keeping every outlet that covered it.
export function dedupeItems(items: RawFeedItem[]): RawFeedItem[] {
    const byTitle = new Map<string, RawFeedItem>();
    for (const item of items) {
        const key = normalizeTitle(item.title);
        const existing = byTitle.get(key);
        if (!existing) {
            byTitle.set(key, { ...item, otherSources: [...item.otherSources] });
            continue;
        }
        const outlets = new Set([...existing.otherSources, item.source, ...item.otherSources]);
        outlets.delete(existing.source);
        existing.otherSources = [...outlets];
        existing.summary = existing.summary || item.summary;
        existing.pubDate = existing.pubDate || item.pubDate;
    }
    return [...byTitle.values()];
}

const STOPWORDS = new Set([
    'about', 'after', 'again', 'their', 'there', 'these', 'those', 'which', 'while', 'would', 'could',
    'should', 'other', 'being', 'where', 'every', 'never', 'always', 'people', 'things', 'because',
]);

function keywords(text: string): Set<string> {
    return new Set(
        text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 4 && !STOPWORDS.has(w))
    );
}

// Best keyword overlap between a story and the user's beliefs. Score is 0..1.
export function matchBelief(text: string, beliefs: BeliefRef[]): { belief: BeliefRef | null; score: number } {
    const words = keywords(text);
    let best: BeliefRef | null = null;
    let bestHits = 0;
    for (const belief of beliefs) {
        let hits = 0;
        for (const w of keywords(belief.statement)) {
            if (words.has(w)) hits++;
        }
        if (hits > bestHits) {
            bestHits = hits;
            best = belief;
        }
    }
    return { belief: best, score: Math.min(bestHits * 0.25, 1) };
}

const QUESTION_PATTERN = /^(how|why|what|is|should|does|where|can|reddit|quora|forum)\b/i;

export function buildFeed(
    items: RawFeedItem[],
    beliefs: BeliefRef[],
    lens: string,
    now = Date.now()
): FeedEntry[] {
    const entries = items.map(item => {
        const isQuestion = QUESTION_PATTERN.test(item.title) || item.title.includes('?');
        const { belief, score } = matchBelief(`${item.title} ${item.summary || ''}`, beliefs);
        const published = item.pubDate ? Date.parse(item.pubDate) : NaN;

        let relatabilityScore = score;
        if (lens === 'beginner' && isQuestion) relatabilityScore += 0.3;

        return {
            entry: {
                title: item.title,
                sourceUrl: item.link,
                source: item.source,
                category: item.query,
                publishedAt: Number.isNaN(published) ? undefined : new Date(published).toISOString(),
                summary: item.summary,
                sourceCount: 1 + item.otherSources.length,
                otherSources: item.otherSources.slice(0, 5),
                relatabilityScore: Math.min(relatabilityScore, 1),
                relatedBeliefId: belief?.id ?? null,
                relatedBelief: belief?.statement ?? null,
                type: (isQuestion ? 'question' : 'article') as FeedEntry['type'],
            },
            rank: rankScore(relatabilityScore, published, 1 + item.otherSources.length, now),
        };
    });

    return entries.sort((a, b) => b.rank - a.rank).map(e => e.entry);
}

// Belief match matters most, then freshness (halves every 2 days), then how widely the story is covered.
export function rankScore(relatability: number, publishedMs: number, sourceCount: number, now: number): number {
    const ageDays = Number.isNaN(publishedMs) ? 7 : Math.max(0, (now - publishedMs) / 86_400_000);
    const freshness = Math.pow(0.5, ageDays / 2);
    const coverage = Math.min(Math.log2(sourceCount) / 4, 0.5);
    return relatability + freshness * 0.6 + coverage;
}
