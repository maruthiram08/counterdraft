// Client-safe helpers for working on a draft piece by piece: other outline shapes,
// rewriting one paragraph, and whole-draft variants.

export interface Span {
    start: number;
    end: number;
    text: string;
}

/** The paragraph (text between blank lines) the caret is in, or the nearest one before it. */
export function paragraphAt(text: string, caret: number): Span | null {
    const at = Math.max(0, Math.min(caret, text.length));
    const blocks: Span[] = [];
    const re = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g;
    for (const m of text.matchAll(re)) {
        if (m[0].trim()) blocks.push({ start: m.index!, end: m.index! + m[0].length, text: m[0] });
    }
    if (!blocks.length) return null;
    return blocks.find(b => at >= b.start && at <= b.end)
        ?? [...blocks].reverse().find(b => b.end <= at)
        ?? blocks[0];
}

export function replaceRange(text: string, start: number, end: number, insert: string): string {
    return text.slice(0, start) + insert + text.slice(end);
}

export interface OutlineShapeOption {
    name: string;
    why: string;
    sections: string[];
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Up to two well-formed alternative outlines that differ from the current one. */
export function parseOutlineShapes(raw: unknown, current: string[] = []): OutlineShapeOption[] {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const currentKey = current.map(s => s.trim().toLowerCase()).join('|');
    return (Array.isArray(r.shapes) ? r.shapes : [])
        .map(s => (s && typeof s === 'object' ? s : {}) as Record<string, unknown>)
        .map(s => ({
            name: str(s.name, 60),
            why: str(s.why, 240),
            sections: (Array.isArray(s.sections) ? s.sections : []).map(x => str(x, 400)).filter(Boolean).slice(0, 10),
        }))
        .filter(s => s.name && s.sections.length >= 2 && s.sections.map(x => x.toLowerCase()).join('|') !== currentKey)
        .slice(0, 2);
}

export type VariantKind = 'shorter' | 'punchier' | 'personal';

export const VARIANT_LABELS: Record<VariantKind, string> = {
    shorter: 'Shorter',
    punchier: 'Punchier',
    personal: 'More personal',
};

export interface DraftVariant {
    kind: VariantKind;
    text: string;
}

/** The variants that came back non-empty and different from the draft, in a fixed order. */
export function parseVariants(raw: unknown, original: string): DraftVariant[] {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const same = original.trim();
    return (Object.keys(VARIANT_LABELS) as VariantKind[])
        .map(kind => ({ kind, text: typeof r[kind] === 'string' ? (r[kind] as string).trim() : '' }))
        .filter(v => v.text && v.text !== same);
}

export interface DraftQuestion {
    question: string;
    hint: string; // what kind of answer helps, e.g. "one moment, a sentence or two"
}

export interface DraftAnswer {
    question: string;
    answer: string;
}

/** Two or three short questions for the writer before drafting. */
export function parseDraftQuestions(raw: unknown): DraftQuestion[] {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const seen = new Set<string>();
    return (Array.isArray(r.questions) ? r.questions : [])
        .map(q => (q && typeof q === 'object' ? q : {}) as Record<string, unknown>)
        .map(q => ({ question: str(q.question, 240), hint: str(q.hint, 120) }))
        .filter(q => {
            const key = q.question.toLowerCase();
            if (!q.question || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 3);
}

/** Answered questions only, trimmed and capped, from a request body. */
export function cleanAnswers(raw: unknown): DraftAnswer[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map(a => (a && typeof a === 'object' ? a : {}) as Record<string, unknown>)
        .map(a => ({
            question: typeof a.question === 'string' ? a.question.trim().slice(0, 240) : '',
            answer: typeof a.answer === 'string' ? a.answer.trim().slice(0, 1500) : '',
        }))
        .filter(a => a.question && a.answer)
        .slice(0, 3);
}
