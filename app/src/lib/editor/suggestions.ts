// Passages the draft wrote for the creator where it needed a detail nobody gave it: an example, a moment, a number.
// The model wraps them in <suggested> tags; the server strips the tags and sends their text alongside the draft,
// so the post stays clean to copy while the draft step can still point at each one until the creator edits it.

const TAG = /<suggested>([\s\S]*?)<\/suggested>/gi;
const STRAY_TAG = /<\/?suggested>/gi;

/** The draft without <suggested> tags, and the text each pair wrapped. */
export function extractSuggestions(raw: string): { text: string; suggestions: string[] } {
    const suggestions: string[] = [];
    const text = raw
        .replace(TAG, (_, inner: string) => {
            const trimmed = inner.trim();
            if (trimmed) suggestions.push(trimmed);
            return trimmed;
        })
        .replace(STRAY_TAG, '');
    return { text, suggestions: [...new Set(suggestions)] };
}

/** The draft with each suggestion that is still in it wrapped in tags again, so a model can tell them apart. */
export function wrapSuggestions(text: string, suggestions: string[]): string {
    let out = text;
    for (const s of findSuggestions(text, suggestions).reverse()) {
        out = `${out.slice(0, s.start)}<suggested>${s.text}</suggested>${out.slice(s.end)}`;
    }
    return out;
}

export interface Suggestion {
    index: number;
    start: number;
    end: number;
    text: string;
}

/** Where each suggestion still sits, word for word, in the draft. One the creator has edited is gone. */
export function findSuggestions(text: string, suggestions: string[] = []): Suggestion[] {
    const found: Omit<Suggestion, 'index'>[] = [];
    for (const s of suggestions) {
        if (!s) continue;
        const start = text.indexOf(s);
        if (start === -1) continue;
        const end = start + s.length;
        if (found.some(f => start < f.end && end > f.start)) continue;
        found.push({ start, end, text: s });
    }
    return found.sort((a, b) => a.start - b.start).map((f, index) => ({ ...f, index }));
}

/** The suggestions still in the draft, in the order the creator reads them. */
export function liveSuggestions(text: string, suggestions: string[] = []): string[] {
    return findSuggestions(text, suggestions).map(s => s.text);
}
