import type { BrainMetadata, CaptureIntent, CaptureKind, ExploreOrigin } from '@/types';

// Lens captures (bookmarks, snips, frames) as source material for post ideas, research and drafting.

// What Lens offers today; 'framing' is still read on older captures
export const CAPTURE_INTENTS: CaptureIntent[] = ['agree', 'counter', 'evidence', 'example', 'style', 'framing'];
export const CAPTURE_KINDS: CaptureKind[] = ['bookmark', 'snip', 'frame'];

// How the writer means each capture to be used, in words the models act on
const INTENT_MEANING: Record<CaptureIntent, string> = {
    agree: 'The creator agrees with this and wants to build on it',
    counter: 'The creator disagrees with this and wants to push back on it',
    evidence: 'The creator saved this as proof or data to back a point',
    style: 'The creator likes how this is written (its hook, structure or format) and wants to borrow the style for their own post, not the content',
    framing: 'The creator likes how this frames the idea and wants to use that framing in their own words',
    example: 'The creator saved this as an example to use',
};

// Per capture, so six long frames still fit a prompt
const TEXT_LIMIT = 2500;

export type CaptureSource = ExploreOrigin['sources'][number];

export interface CaptureRow {
    id: string;
    source_url?: string | null;
    source_title?: string | null;
    source_domain?: string | null;
    ocr_text?: string | null;
    user_note?: string | null;
    intent_type?: string | null;
    image_path?: string | null;
    ai_metadata?: { kind?: unknown; type?: unknown; key_insight?: unknown; visual_summary?: unknown; intent?: unknown } | null;
}

export function isCaptureIntent(value: unknown): value is CaptureIntent {
    return typeof value === 'string' && (CAPTURE_INTENTS as string[]).includes(value);
}

export function isCaptureKind(value: unknown): value is CaptureKind {
    return typeof value === 'string' && (CAPTURE_KINDS as string[]).includes(value);
}

// Captures saved before Lens 1.0.3 have no kind: a bookmark is the one with ai_metadata.type 'bookmark'.
// An older snip and frame can't be told apart, so those stay unlabelled.
export function captureKind(row: Pick<CaptureRow, 'ai_metadata'>): CaptureKind | undefined {
    const meta = row.ai_metadata;
    if (isCaptureKind(meta?.kind)) return meta.kind;
    if (meta?.type === 'bookmark') return 'bookmark';
    return undefined;
}

// The column first; a Style capture saved before the database allowed it keeps its intent in ai_metadata
export function captureIntent(row: Pick<CaptureRow, 'intent_type' | 'ai_metadata'>): CaptureIntent | undefined {
    if (isCaptureIntent(row.intent_type)) return row.intent_type;
    return isCaptureIntent(row.ai_metadata?.intent) ? row.ai_metadata.intent : undefined;
}

// The domain without "www.", or the raw URL when it isn't one
export function captureDomain(row: Pick<CaptureRow, 'source_domain' | 'source_url'>): string {
    const domain = row.source_domain && row.source_domain !== 'unknown' ? row.source_domain : '';
    if (domain) return domain.replace(/^www\./, '');
    try {
        return new URL(row.source_url || '').hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

export function trimText(text: string, limit = TEXT_LIMIT): string {
    const clean = text.trim();
    if (clean.length <= limit) return clean;
    const cut = clean.slice(0, limit);
    const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '));
    return `${(lastBreak > limit * 0.6 ? cut.slice(0, lastBreak + 1) : cut).trim()} […]`;
}

// One capture as a source an idea carries through research, outline and draft
export function captureToSource(row: CaptureRow, pageText?: string): CaptureSource {
    // A chart or diagram has little text; the capture model's description of it is what a writer can use
    const visual = typeof row.ai_metadata?.visual_summary === 'string' ? row.ai_metadata.visual_summary.trim() : '';
    const words = (row.ocr_text || pageText || '').trim();
    const text = visual ? `${words}${words ? '\n\n' : ''}[What the image shows: ${visual}]` : words;
    const domain = captureDomain(row);
    const note = row.user_note?.trim();
    const insight = typeof row.ai_metadata?.key_insight === 'string' ? row.ai_metadata.key_insight.trim() : '';
    return {
        title: row.source_title?.trim() || note?.slice(0, 80) || domain || 'Saved capture',
        url: row.source_url || '',
        source: domain || undefined,
        captureId: row.id,
        captureKind: captureKind(row),
        intent: captureIntent(row),
        note: note || undefined,
        text: text ? trimText(text) : undefined,
        takeaway: insight || undefined,
    };
}

export function captureSources(meta?: Partial<BrainMetadata>): CaptureSource[] {
    return (meta?.explore?.sources || []).filter(s => !!s.captureId);
}

// All captures pulling the same way give the ideas a stance; a mix leaves it open
export function stanceFromIntents(intents: Array<CaptureIntent | undefined>): 'agree' | 'push_back' | undefined {
    const set = new Set(intents.filter(Boolean));
    if (set.size !== 1) return undefined;
    if (set.has('agree')) return 'agree';
    if (set.has('counter')) return 'push_back';
    return undefined;
}

function describe(s: CaptureSource, i: number, limit: number): string {
    const where = s.source || s.url;
    const lines = [`[C${i + 1}] ${s.title}${where ? ` (${where})` : ''}`];
    if (s.intent) lines.push(`What the creator thinks: ${INTENT_MEANING[s.intent]}.`);
    if (s.note) lines.push(`Their note: "${s.note}"`);
    if (s.text) lines.push(`Captured text:\n"""\n${trimText(s.text, limit)}\n"""`);
    else if (s.takeaway) lines.push(`Key point: ${s.takeaway}`);
    return lines.join('\n');
}

// Captures for the idea step: all of them, each with what the writer thinks of it
export function formatCapturesForIdeas(sources: CaptureSource[]): string {
    return sources.map((s, i) => describe(s, i, TEXT_LIMIT)).join('\n\n');
}

// The captures an idea came from, for research, outline and draft. Never one "primary" source:
// each is weighed by what the creator thinks of it.
export function formatCaptureSources(meta?: Partial<BrainMetadata>, limit = TEXT_LIMIT): string {
    const sources = captureSources(meta);
    if (!sources.length) return '';
    const list = sources.slice(0, 6).map((s, i) => describe(s, i, limit)).join('\n\n');
    return `\n\nTHE CREATOR'S CAPTURES (what they saved while reading; this is what the post responds to. Use them as the creator intends each one, quote sparingly and never pass their words off as the creator's. Cite one by the domain in brackets after its title):\n${list}`;
}
