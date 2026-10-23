// Momentum tags for Explore: whether a story is just taking off, already everywhere, or timeless.
// Worked out from the date and outlet count each result already carries, so it costs no extra call.

export type Momentum = 'rising' | 'crowded' | 'evergreen';

export interface MomentumInput {
    publishedAt?: string;
    sourceCount?: number;
    kind?: string;
}

export const MOMENTUM_LABELS: Record<Momentum, string> = {
    rising: 'Rising',
    crowded: 'Crowded',
    evergreen: 'Evergreen',
};

export const MOMENTUM_HINTS: Record<Momentum, string> = {
    rising: 'New and being picked up by more outlets. Early enough to be one of the first takes.',
    crowded: 'Already covered widely. Write only with a take the coverage is missing.',
    evergreen: 'Stays useful for months. Good for a post that keeps working.',
};

const DAY_MS = 86_400_000;
// Outlets covering one story before it counts as everywhere
const CROWDED_OUTLETS = 5;
const RISING_MAX_DAYS = 2;
const EVERGREEN_MIN_DAYS = 90;
const LASTING_KINDS = ['framework', 'case study', 'data'];

function ageDays(publishedAt: string | undefined, now: number): number | null {
    const published = publishedAt ? Date.parse(publishedAt) : NaN;
    return Number.isNaN(published) ? null : Math.max(0, (now - published) / DAY_MS);
}

export function storyMomentum(story: MomentumInput, now = Date.now()): Momentum | null {
    const outlets = story.sourceCount ?? 1;
    const age = ageDays(story.publishedAt, now);
    if (outlets >= CROWDED_OUTLETS) return 'crowded';
    if (age !== null && age <= RISING_MAX_DAYS && outlets >= 2) return 'rising';
    if (age !== null && age >= EVERGREEN_MIN_DAYS) return 'evergreen';
    if (story.kind && LASTING_KINDS.includes(story.kind) && (age === null || age > 30)) return 'evergreen';
    return null;
}

export interface TopicMomentum {
    tag: Momentum;
    reason: string;
}

/** One tag for the whole search, from how its stories spread over time and outlets. */
export function topicMomentum(stories: MomentumInput[], now = Date.now()): TopicMomentum | null {
    const dated = stories.map(s => ageDays(s.publishedAt, now)).filter((a): a is number => a !== null);
    if (stories.length < 3 || dated.length < 3) return null;

    const crowded = stories.filter(s => (s.sourceCount ?? 1) >= CROWDED_OUTLETS).length;
    const recent = dated.filter(a => a <= 3).length;
    const old = dated.filter(a => a > 30).length;

    if (crowded >= 3) {
        return { tag: 'crowded', reason: `${crowded} of these stories are each covered by ${CROWDED_OUTLETS}+ outlets` };
    }
    if (recent >= 3 && recent / dated.length >= 0.6) {
        return { tag: 'rising', reason: `${recent} of ${dated.length} stories are from the last 3 days` };
    }
    if (old / dated.length >= 0.6) {
        return { tag: 'evergreen', reason: `Most of what's written is over a month old and still relevant` };
    }
    return null;
}
