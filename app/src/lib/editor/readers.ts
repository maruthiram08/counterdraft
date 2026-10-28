// The reader panel: a few imagined readers from the post's audience react to a draft.
// Client-safe: used by the panel, the Hook lab and the readers route.
// These are AI opinions, not a forecast of reach, and the UI says so.

export const PANEL_SIZE = 5;

export interface Reader {
    name: string; // first name only, e.g. "Priya"
    who: string; // one line: role and attitude, e.g. "Engineering manager, sceptical of hiring advice"
}

export interface ReaderReaction extends Reader {
    readsOn: boolean; // would click "see more" after the opening
    reaction: string; // first reaction, in their own words
    comment: string; // the comment they'd leave, or '' when they wouldn't comment
    lostAt: string; // a line quoted from the post where they lost interest, or ''
    opens: number[]; // when openings were given: which of them they'd click "see more" on
}

export interface ReaderPanelResult {
    readers: ReaderReaction[];
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// The panel shows reactions and quotes in its own quote marks, so drop any the model added
// only when the whole text is wrapped, so a reaction that opens with a quoted phrase keeps its marks
const unquote = (s: string) => (/^["“][\s\S]*["”]$/.test(s) && s.length > 2 ? s.slice(1, -1).trim() : s);
const squash = (s: string) => s.toLowerCase().replace(/[\s"“”'‘’]+/g, ' ').trim();

/** True when the quote really is in the post, so "lost them at" never points at a line that isn't there. */
export function quotedFrom(post: string, quote: string): boolean {
    const q = squash(quote);
    return q.length >= 8 && squash(post).includes(q);
}

/** Keeps only well-formed readers from the model's JSON. */
export function parseReaderPanel(raw: unknown, post: string, openingCount = 0): ReaderPanelResult {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const seen = new Set<string>();
    const readers = (Array.isArray(r.readers) ? r.readers : [])
        .map(o => (o && typeof o === 'object' ? o : {}) as Record<string, unknown>)
        .map(o => {
            const lostAt = unquote(str(o.lostAt, 240));
            const opens = Array.isArray(o.opens)
                ? [...new Set(o.opens.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < openingCount))]
                : [];
            return {
                name: str(o.name, 30),
                who: str(o.who, 120),
                readsOn: o.readsOn === true,
                reaction: unquote(str(o.reaction, 280)),
                comment: str(o.comment, 280),
                lostAt: lostAt && quotedFrom(post, lostAt) ? lostAt : '',
                opens,
            };
        })
        .filter(o => {
            const key = o.name.toLowerCase();
            if (!o.name || !o.reaction || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, PANEL_SIZE);
    return { readers };
}

/** How many readers would click "see more" on each opening, in the order the openings were given. */
export function openingVotes(result: ReaderPanelResult, openingCount: number): number[] {
    const votes = new Array(openingCount).fill(0);
    for (const reader of result.readers) for (const i of reader.opens) if (i < openingCount) votes[i]++;
    return votes;
}
