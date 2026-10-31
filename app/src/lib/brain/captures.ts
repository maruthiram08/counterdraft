import type { BrainMetadata, CaptureIntent, CaptureKind, CapturedPost, ExploreOrigin } from '@/types';

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

// What an idea keeps of each capture: everything Lens saves, so research, outline and draft can see all of it
export const SAVED_TEXT_LIMIT = 10000;
// Default per capture in a short prompt
const TEXT_LIMIT = 2500;
// Characters of capture text a prompt can hold, shared between the captures
export const PROMPT_BUDGET = 12000;

// One capture gets most of the budget; six share it, but never drop below a useful slice
export function perCaptureLimit(count: number, budget = PROMPT_BUDGET): number {
    return Math.max(1200, Math.min(8000, Math.floor(budget / Math.max(1, count))));
}

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
    imageUrl?: string; // Public URL of the stored image, when the caller looked it up
    ai_metadata?: { kind?: unknown; type?: unknown; key_insight?: unknown; visual_summary?: unknown; intent?: unknown; post?: { author?: unknown; url?: unknown } | null } | null;
}

export function isCaptureIntent(value: unknown): value is CaptureIntent {
    return typeof value === 'string' && (CAPTURE_INTENTS as string[]).includes(value);
}

export function isCaptureKind(value: unknown): value is CaptureKind {
    return typeof value === 'string' && (CAPTURE_KINDS as string[]).includes(value);
}

// Captures saved before Lens 1.0.3 have no kind: a bookmark is the one with ai_metadata.type 'bookmark'.
// Nothing recorded whether an older image capture was a snip or a frame. A frame copies a whole post or
// section, a snip is a small box drawn on screen, so long or many-line text is read as a frame.
// Either guess can be corrected on the card, which saves the kind.
export const LEGACY_FRAME_CHARS = 300;
export function captureKind(row: Pick<CaptureRow, 'ai_metadata' | 'ocr_text' | 'image_path'>): CaptureKind | undefined {
    const meta = row.ai_metadata;
    if (isCaptureKind(meta?.kind)) return meta.kind;
    if (meta?.type === 'bookmark') return 'bookmark';
    const text = (row.ocr_text || '').trim();
    if (!text && !row.image_path) return undefined;
    const lines = text.split('\n').filter(line => line.trim()).length;
    return text.length >= LEGACY_FRAME_CHARS || lines >= 4 ? 'frame' : 'snip';
}

// The column first; a Style capture saved before the database allowed it keeps its intent in ai_metadata
export function captureIntent(row: Pick<CaptureRow, 'intent_type' | 'ai_metadata'>): CaptureIntent | undefined {
    if (isCaptureIntent(row.intent_type)) return row.intent_type;
    return isCaptureIntent(row.ai_metadata?.intent) ? row.ai_metadata.intent : undefined;
}

// Who wrote the captured post, when Lens read it from the page
export function captureAuthor(row: Pick<CaptureRow, 'ai_metadata'>): string | undefined {
    const author = row.ai_metadata?.post?.author;
    return typeof author === 'string' && author.trim() ? author.trim().slice(0, 120) : undefined;
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
    const raw = (row.ocr_text || pageText || '').trim();
    const words = raw ? trimText(raw, SAVED_TEXT_LIMIT) : '';
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
        text: text || undefined,
        takeaway: insight || undefined,
        author: captureAuthor(row),
        image: row.imageUrl || undefined,
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
    if (s.author) lines.push(`Written by: ${s.author}`);
    if (s.intent) lines.push(`What the creator thinks: ${INTENT_MEANING[s.intent]}.`);
    if (s.note) lines.push(`Their note: "${s.note}"`);
    if (s.text) lines.push(`Captured text:\n"""\n${trimText(s.text, limit)}\n"""`);
    else if (s.takeaway) lines.push(`Key point: ${s.takeaway}`);
    return lines.join('\n');
}

// Captures for the idea step: all of them, each with what the writer thinks of it
export function formatCapturesForIdeas(sources: CaptureSource[], budget = PROMPT_BUDGET): string {
    const limit = perCaptureLimit(sources.length, budget);
    return sources.map((s, i) => describe(s, i, limit)).join('\n\n');
}

// The captures an idea came from, for research, outline and draft. Never one "primary" source:
// each is weighed by what the creator thinks of it. The budget is shared, so one long frame gets most of it.
export function formatCaptureSources(meta?: Partial<BrainMetadata>, budget = PROMPT_BUDGET): string {
    const sources = captureSources(meta).slice(0, 6);
    if (!sources.length) return '';
    const limit = perCaptureLimit(sources.length, budget);
    const list = sources.map((s, i) => describe(s, i, limit)).join('\n\n');
    return `\n\nTHE CREATOR'S CAPTURES (what they saved while reading; this is what the post responds to. Use them as the creator intends each one, quote sparingly and never pass their words off as the creator's. Cite one by the domain in brackets after its title):\n${list}`;
}

const webUrl = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString().slice(0, 500) : undefined;
    } catch {
        return undefined;
    }
};

// Only plain text and web links from what Lens read off the page
export function capturedPost(value: unknown): CapturedPost | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Record<string, unknown>;
    const author = typeof raw.author === 'string' ? raw.author.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
    const post: CapturedPost = {
        ...(author ? { author } : {}),
        ...(webUrl(raw.authorUrl) ? { authorUrl: webUrl(raw.authorUrl) } : {}),
        ...(webUrl(raw.url) ? { url: webUrl(raw.url) } : {}),
    };
    return Object.keys(post).length ? post : undefined;
}
