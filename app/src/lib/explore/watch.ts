// Watching saved topics: what has been published about each one since the writer last looked.

import { normalizeTitle, type RawFeedItem } from './feed';

export interface WatchedTopic {
    id: string;
    title: string;
    // The search that finds follow-ups to the saved story
    query: string;
    newCount: number;
    latest: { title: string; url: string; source: string; publishedAt?: string }[];
}

const FILLER = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'as',
    'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'its', 'it', 'this', 'that', 'these',
    'how', 'why', 'what', 'who', 'when', 'where', 'which', 'will', 'can', 'could', 'should', 'would',
    'says', 'said', 'new', 'after', 'over', 'into', 'about', 'than', 'more', 'just', 'now', 'here',
]);

const MAX_QUERY_WORDS = 6;

/** A short news search for a saved story: its first few meaningful words, without the outlet suffix. */
export function watchQuery(title: string): string {
    const words = title
        .replace(/\s+[-|–]\s+[^-|–]+$/, '')
        .split(/\s+/)
        .map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}%$]+$/gu, ''))
        .filter(w => w && !FILLER.has(w.toLowerCase()));
    return words.slice(0, MAX_QUERY_WORDS).join(' ');
}

/** Stories published after `since`, newest first, leaving out the saved story itself. */
export function newSince(items: RawFeedItem[], since: string, savedTitle: string): RawFeedItem[] {
    const sinceMs = Date.parse(since);
    const saved = normalizeTitle(savedTitle);
    const time = (i: RawFeedItem) => (i.pubDate ? Date.parse(i.pubDate) : NaN);
    return items
        .filter(i => time(i) > sinceMs && normalizeTitle(i.title) !== saved)
        .sort((a, b) => time(b) - time(a));
}
