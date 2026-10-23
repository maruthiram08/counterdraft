// What a writer told Explore from the cards themselves: "More like this" and "Not for me".
// Kept on the device and sent with each topics request, so "For you" and the tabs follow it.

export interface Taste {
    more: string[];
    less: string[];
}

export type TasteKind = keyof Taste;

export const EMPTY_TASTE: Taste = { more: [], less: [] };

const MAX_SIGNALS = 15;
const MAX_SIGNAL_LENGTH = 120;

function cleanSignal(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const text = value.replace(/\s+/g, ' ').trim().slice(0, MAX_SIGNAL_LENGTH);
    return text || null;
}

/** Newest first. A signal lives in one list only, so changing your mind moves it across. */
export function addToTaste(taste: Taste, kind: TasteKind, signal: string): Taste {
    const text = cleanSignal(signal);
    if (!text) return taste;
    const same = (s: string) => s.toLowerCase() === text.toLowerCase();
    const next = { more: taste.more.filter(s => !same(s)), less: taste.less.filter(s => !same(s)) };
    next[kind] = [text, ...next[kind]].slice(0, MAX_SIGNALS);
    return next;
}

/** Keeps only well-formed signals from a request body or storage. */
export function cleanTaste(raw: unknown): Taste {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const list = (v: unknown) => (Array.isArray(v) ? v : [])
        .map(cleanSignal)
        .filter((s): s is string => !!s)
        .slice(0, MAX_SIGNALS);
    return { more: list(r.more), less: list(r.less) };
}

export function hasTaste(taste: Taste): boolean {
    return taste.more.length > 0 || taste.less.length > 0;
}

/** For prompts: what to favour and what to stay away from. */
export function describeTaste(taste: Taste): string {
    const lines = [
        taste.more.length ? `They asked for more like:\n${taste.more.map(s => `- ${s}`).join('\n')}` : '',
        taste.less.length ? `They marked these "Not for me", so avoid them and anything close:\n${taste.less.map(s => `- ${s}`).join('\n')}` : '',
    ].filter(Boolean);
    return lines.join('\n');
}

/** Stable and short, for cache keys. */
export function tasteKey(taste: Taste): string {
    if (!hasTaste(taste)) return '';
    const text = [...taste.more, '|', ...taste.less].join('\n').toLowerCase();
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    return (hash >>> 0).toString(36);
}
