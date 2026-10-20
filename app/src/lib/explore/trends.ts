// Shared pieces of the Explore starting topics: the personal category and how each category is searched.

export const FOR_YOU = 'For you';

export interface WriterProfile {
    role?: string;
    context?: string;
    beliefs: string[];
}

/**
 * The news search behind a category's topics. "For you" searches what the writer works on;
 * the fixed categories search the category, narrowed to the writer's role when known.
 * Returns null when there is nothing to personalise "For you" with.
 */
export function buildTrendSearch(category: string, profile: WriterProfile): string | null {
    if (category === FOR_YOU) {
        const about = [profile.role, profile.context?.slice(0, 160)].filter(Boolean).join(': ');
        return about ? `news and debates this week for ${about}` : null;
    }
    return profile.role
        ? `news and debates this week in ${category} that matter to ${profile.role}`
        : `news and debates this week in ${category}`;
}
