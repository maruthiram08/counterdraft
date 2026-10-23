// The opening of a LinkedIn post: what shows before "see more", and swapping in a new one.
// Client-safe: used by the Hook lab, the LinkedIn preview, and the openings route.

export type Device = 'phone' | 'desktop';

// LinkedIn cuts a post after about this many characters or three lines, whichever comes first.
// The exact point varies with screen width, so the preview treats these as close estimates.
export const SEE_MORE_CHARS: Record<Device, number> = { phone: 140, desktop: 210 };
export const SEE_MORE_LINES = 3;
export const LINKEDIN_MAX_CHARS = 3000;

export interface SeeMoreCut {
    visible: string;
    hidden: string;
    truncated: boolean;
}

/** Where LinkedIn's "see more" falls for this post on this device. */
export function seeMoreCut(post: string, device: Device): SeeMoreCut {
    const text = post.replace(/\r\n/g, '\n').trim();
    let cut = Math.min(text.length, SEE_MORE_CHARS[device]);

    // Each line break uses up one of the three visible lines
    let lines = 1;
    for (let i = 0; i < cut; i++) {
        if (text[i] === '\n' && ++lines > SEE_MORE_LINES) {
            cut = i;
            break;
        }
    }

    if (cut >= text.length) return { visible: text, hidden: '', truncated: false };

    // Don't split a word: step back to the last space when there's one reasonably close
    const space = text.lastIndexOf(' ', cut);
    if (text[cut] !== ' ' && text[cut] !== '\n' && space > cut - 25) cut = space;

    return { visible: text.slice(0, cut).trimEnd(), hidden: text.slice(cut).trimStart(), truncated: true };
}

/** The post's opening: its first paragraph, up to the first blank line. */
export function splitOpening(post: string): { opening: string; rest: string } {
    const text = post.replace(/\r\n/g, '\n').trim();
    const gap = text.search(/\n\s*\n/);
    if (gap === -1) return { opening: text, rest: '' };
    return { opening: text.slice(0, gap).trim(), rest: text.slice(gap).replace(/^\s+/, '') };
}

/** The same post with a new opening in place of the old one. */
export function replaceOpening(post: string, opening: string): string {
    const { rest } = splitOpening(post);
    const next = opening.trim();
    return rest ? `${next}\n\n${rest}` : next;
}

export interface Opening {
    style: string;
    text: string;
    why: string;
    rating: number; // 1-5: how likely a reader in the audience clicks "see more"
}

export interface OpeningsResult {
    current: { rating: number; note: string } | null;
    options: Opening[];
}

const MAX_OPENING = 400;
const clampRating = (v: unknown) => Math.max(1, Math.min(5, Math.round(Number(v)) || 1));
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Keeps only well-formed openings from the model's JSON. */
export function parseOpenings(raw: unknown, currentOpening = ''): OpeningsResult {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const cur = (r.current && typeof r.current === 'object' ? r.current : null) as Record<string, unknown> | null;
    const seen = new Set([currentOpening.trim().toLowerCase()]);
    const options = (Array.isArray(r.options) ? r.options : [])
        .map(o => (o && typeof o === 'object' ? o : {}) as Record<string, unknown>)
        .map(o => ({ style: str(o.style, 40), text: str(o.text, MAX_OPENING), why: str(o.why, 240), rating: clampRating(o.rating) }))
        .filter(o => {
            const key = o.text.toLowerCase();
            if (!o.text || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 3);
    return {
        current: cur ? { rating: clampRating(cur.rating), note: str(cur.note, 240) } : null,
        options,
    };
}
