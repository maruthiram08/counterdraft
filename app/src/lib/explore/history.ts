// The writer's own history on a topic: whether they've written on it before, and what moved since.
// Pure and client-safe; the search itself is in history-search.ts.

export interface PastPiece {
    id: string;
    kind: 'post' | 'draft';
    text: string;
    date: string;
}

export interface TopicHistory {
    // Their earlier piece on this topic, if any
    before?: {
        id: string;
        kind: PastPiece['kind'];
        date: string;
        // What that piece said, in a line
        gist: string;
        // What the current coverage adds since then: the hook for a follow-up
        changed: string;
    };
    // True when nothing they've written touches the topic
    newGround: boolean;
}

/** Keeps only an answer that points at one of the pieces given, so nothing is invented. */
export function parseHistory(raw: unknown, pieces: PastPiece[]): TopicHistory {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const index = typeof r.match === 'number' ? r.match : NaN;
    const piece = Number.isInteger(index) ? pieces[index] : undefined;
    const text = (v: unknown, max: number) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
    const gist = text(r.gist, 200);
    const changed = text(r.changed, 320);
    if (piece && gist && changed) {
        return { before: { id: piece.id, kind: piece.kind, date: piece.date, gist, changed }, newGround: false };
    }
    return { newGround: r.related !== true };
}

/** "March", or "March 2025" when it wasn't this year. */
export function monthLabel(iso: string, now = new Date()): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    return date.getUTCFullYear() === now.getUTCFullYear() ? month : `${month} ${date.getUTCFullYear()}`;
}
