// Shared pieces of the Explore starting topics: the personal category and how each category is searched.

export const FOR_YOU = 'For you';

export interface WriterProfile {
    role?: string;
    context?: string;
    beliefs: string[];
    // Explore topics they went on to draft or publish: the clearest sign of what works for them
    wrote?: { topic: string; published: boolean }[];
}

interface ExploreItem {
    hook?: string | null;
    stage?: string | null;
    brain_metadata?: { explore?: { query?: string; label?: string } } | null;
}

/** Explore topics that became drafts or posts, published first, one line each, without repeats. */
export function exploreTrackRecord(items: ExploreItem[], max = 8): NonNullable<WriterProfile['wrote']> {
    const seen = new Set<string>();
    const record: NonNullable<WriterProfile['wrote']> = [];
    const ordered = [...items].sort((a, b) => Number(b.stage === 'published') - Number(a.stage === 'published'));
    for (const item of ordered) {
        const origin = item.brain_metadata?.explore;
        const topic = (origin?.label || origin?.query || item.hook || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        const key = topic.toLowerCase();
        if (!topic || seen.has(key)) continue;
        seen.add(key);
        record.push({ topic, published: item.stage === 'published' });
        if (record.length >= max) break;
    }
    return record;
}

export function describeTrackRecord(wrote: WriterProfile['wrote']): string {
    if (!wrote?.length) return '';
    return `Topics from Explore they went on to write (lean toward topics like these):\n${wrote.map(w => `- ${w.topic}${w.published ? ' (published)' : ' (drafted)'}`).join('\n')}`;
}

/**
 * The news search behind a category's topics. "For you" searches what the writer works on;
 * the fixed categories search the category, narrowed to the writer's role when known.
 * Returns null when there is nothing to personalise "For you" with.
 */
export function buildTrendSearch(category: string, profile: WriterProfile): string | null {
    if (category === FOR_YOU) {
        const about = [profile.role, profile.context?.slice(0, 160)].filter(Boolean).join(': ');
        if (about) return `news and debates this week for ${about}`;
        // Without a profile, what they've written from Explore says what they care about
        const written = profile.wrote?.slice(0, 3).map(w => w.topic).join(', ');
        return written ? `news and debates this week on ${written}` : null;
    }
    return profile.role
        ? `news and debates this week in ${category} that matter to ${profile.role}`
        : `news and debates this week in ${category}`;
}

// Broad categories that mix in with the writer's own, so the tabs never feel narrow
export const GENERAL_CATEGORIES = [
    'Technology & AI', 'Culture & Society', 'Business Strategy', 'Personal Growth', 'Leadership',
    'Careers', 'Startups', 'Health & Wellbeing', 'Money', 'Parenting', 'Education', 'Marketing',
    'Creator Economy', 'Climate', 'Future of Work',
];

export const CATEGORIES_PER_SET = 5;

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * A random set of categories: mostly from the writer's own niche, topped up with general ones.
 * Categories in `exclude` (the set they just saw) are skipped while enough others remain.
 */
export function pickCategories(
    niche: string[],
    exclude: string[],
    count = CATEGORIES_PER_SET,
    random: () => number = Math.random
): string[] {
    const seen = new Set(exclude.map(c => c.toLowerCase()));
    const fresh = (list: string[]) => list.filter(c => !seen.has(c.toLowerCase()));
    const nicheShare = Math.min(niche.length, Math.ceil(count * 0.6));

    const picked = shuffle(fresh(niche), random).slice(0, nicheShare);
    // Fresh categories first; repeat ones only if there aren't enough fresh ones left
    const pool = [...GENERAL_CATEGORIES, ...niche];
    for (const c of [...shuffle(fresh(pool), random), ...shuffle(pool, random)]) {
        if (picked.length >= count) break;
        if (!picked.some(p => p.toLowerCase() === c.toLowerCase())) picked.push(c);
    }
    return shuffle(picked, random);
}
