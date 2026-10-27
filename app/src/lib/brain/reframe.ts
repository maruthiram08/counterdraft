import type { Artifact, BrainMetadata, CaptureIntent, ExploreOrigin, ReframeMode, ReframeSettings } from '@/types';
import { captureAuthor, captureDomain, captureIntent, captureToSource } from './captures';

// Reframe: a quick post reacting to one captured post. It skips research and outline and
// drafts straight from the capture, in the way the creator picked.

export const REFRAME_MODES: Array<{ id: ReframeMode; label: string; hint: string }> = [
    { id: 'build', label: 'Build on it', hint: 'Agree and take it further' },
    { id: 'push_back', label: 'Push back', hint: 'Say what it gets wrong' },
    { id: 'my_story', label: 'Same point, my story', hint: 'Make the point with your own experience' },
    { id: 'proof', label: 'Use as proof', hint: 'Back up your own point with it' },
    { id: 'style', label: 'Borrow the style', hint: 'Same shape, your own topic' },
];

// What the writer is told for each mode
const MODE_INSTRUCTION: Record<ReframeMode, string> = {
    build: "The creator agrees with the original post. Their post builds on it: why it's right, what follows from it, or the part it leaves out that makes it even truer. Add to it; never summarise it.",
    push_back: "The creator disagrees with the original post. Their post pushes back clearly and fairly: name the claim, say what it gets wrong or misses, and give the creator's alternative. Argue with the idea, never attack the author.",
    my_story: "The creator wants to make the same point as the original post through their own experience. The point can match; the story, example, words and structure must be the creator's own.",
    proof: "The creator uses the original post as evidence for a point of their own. Refer to it briefly and credit it; the post is about the creator's point, not the original.",
    style: "The creator likes how the original post is written. Borrow its shape (hook pattern, structure, rhythm, length, line breaks) for a post on the creator's own topic. Never reuse its content, sentences or distinctive phrases.",
};

// The capture's intent picks the starting mode; Framing captures were saved for their angle
const MODE_FROM_INTENT: Record<CaptureIntent, ReframeMode> = {
    agree: 'build',
    counter: 'push_back',
    evidence: 'proof',
    example: 'proof',
    style: 'style',
    framing: 'my_story',
};

export function modeFromIntent(intent?: CaptureIntent): ReframeMode {
    return intent ? MODE_FROM_INTENT[intent] : 'build';
}

export function reframeModeLabel(mode: ReframeMode): string {
    return REFRAME_MODES.find(m => m.id === mode)?.label || 'Reframe';
}

export function isReframeMode(value: unknown): value is ReframeMode {
    return typeof value === 'string' && REFRAME_MODES.some(m => m.id === value);
}

// Format choices on the sheet. Short sets a length; the rest are the wizard's own formats.
export const REFRAME_FORMATS: Array<{ id: string; label: string; format?: string; length?: string }> = [
    { id: 'auto', label: 'Let it decide' },
    { id: 'short', label: 'Short take', length: 'Short: 60 to 150 words' },
    { id: 'story', label: 'Story', format: 'personal_story' },
    { id: 'argument', label: 'Argument', format: 'thought_leadership' },
    { id: 'list', label: 'List', format: 'listicle' },
];

// "Jane Doe's post", or "a post on medium.com" when Lens couldn't read the author
export function whosePost(author?: string, domain?: string): string {
    if (author) return `${author}'s post`;
    return domain ? `a post on ${domain}` : 'a post';
}

const TITLE_FOR_MODE: Record<ReframeMode, (who: string) => string> = {
    build: who => `Building on ${who}`,
    push_back: who => `Pushing back on ${who}`,
    my_story: who => `My story on ${who}`,
    proof: who => `Using ${who} as proof`,
    style: who => `In the style of ${who}`,
};

// Everything a new Pipeline item needs to open straight on the Draft step
export function buildReframeItem(capture: Artifact, { mode, take, formatId }: { mode: ReframeMode; take?: string; formatId?: string }) {
    const author = captureAuthor(capture);
    const domain = captureDomain(capture);
    const cleanTake = take?.trim().slice(0, 300) || undefined;
    const original = (capture.ocr_text || '').trim().slice(0, 10000);
    const postUrl = typeof capture.ai_metadata?.post?.url === 'string' ? capture.ai_metadata.post.url : capture.source_url || undefined;
    const chosen = REFRAME_FORMATS.find(f => f.id === formatId);

    const reframe: ReframeSettings = { mode, take: cleanTake, captureId: capture.id, author, postUrl, original };
    const explore: ExploreOrigin = {
        query: '',
        label: 'Reframe',
        from: 'captures',
        sources: [captureToSource(capture)],
        savedAs: 'idea',
    };
    const hook = cleanTake && cleanTake.length >= 10
        ? cleanTake
        : TITLE_FOR_MODE[mode](whosePost(author, domain));

    return {
        hook,
        angle: cleanTake || REFRAME_MODES.find(m => m.id === mode)?.hint,
        format: chosen?.format,
        brain_metadata: {
            explore,
            reframe,
            ...(chosen?.format ? { format: chosen.format } : {}),
            ...(chosen?.length ? { length: chosen.length } : {}),
        } as Partial<BrainMetadata>,
    };
}

// A capture can be reframed once it has words to react to
export function canReframe(capture: Pick<Artifact, 'ocr_text'>): boolean {
    return (capture.ocr_text || '').trim().length >= 40;
}

export function startingMode(capture: Artifact): ReframeMode {
    return modeFromIntent(captureIntent(capture));
}

// The reframe for every prompt: how to respond and the creator's take
export function formatReframe(meta?: Partial<BrainMetadata>): string {
    const reframe = meta?.reframe;
    if (!reframe || !isReframeMode(reframe.mode)) return '';
    const lines = [`How the creator wants to respond (${reframeModeLabel(reframe.mode)}): ${MODE_INSTRUCTION[reframe.mode]}`];
    if (reframe.take) lines.push(`Their take, in their words: "${reframe.take}"`);
    return lines.join('\n');
}

export function formatOriginalPost(reframe: ReframeSettings, limit = 6000): string {
    const by = reframe.author ? ` by ${reframe.author}` : '';
    return `THE ORIGINAL POST${by} (what the creator is reacting to; never copy its sentences):\n"""\n${reframe.original.slice(0, limit)}\n"""`;
}

// --- Originality: the draft against the post it reacts to ---

// Eight words in a row shared with the original is copying, not coincidence
const RUN = 8;

const words = (text: string) => text.toLowerCase().replace(/[’']/g, "'").match(/[\p{L}\p{N}']+/gu) || [];

// A line the writer put in quotation marks is a credited quote, not copying
const isQuoted = (line: string) => /^["“”'‘].*["“”'’]$/.test(line.trim()) || /^>/.test(line.trim());

export interface OriginalityResult {
    copied: string[]; // Draft lines that repeat the original
    share: number; // Percent of the draft's words inside copied runs, 0-100
}

export function checkOriginality(draft: string, original: string): OriginalityResult {
    const source = words(original);
    if (source.length < RUN) return { copied: [], share: 0 };
    const runs = new Set<string>();
    for (let i = 0; i + RUN <= source.length; i++) runs.add(source.slice(i, i + RUN).join(' '));

    const copied: string[] = [];
    let copiedWords = 0;
    let totalWords = 0;
    // Lines, then sentences, so one copied sentence in a long paragraph is what gets flagged
    const sentences = draft.split(/\n+/).flatMap(line => line.match(/[^.!?]+[.!?]*["”’']?/g) || []).map(s => s.trim()).filter(Boolean);
    for (const sentence of sentences) {
        const w = words(sentence);
        totalWords += w.length;
        if (w.length < RUN || isQuoted(sentence)) continue;
        const hit = new Array(w.length).fill(false);
        for (let i = 0; i + RUN <= w.length; i++) {
            if (runs.has(w.slice(i, i + RUN).join(' '))) hit.fill(true, i, i + RUN);
        }
        const n = hit.filter(Boolean).length;
        if (n) {
            copied.push(sentence);
            copiedWords += n;
        }
    }
    return { copied, share: totalWords ? Math.round((copiedWords / totalWords) * 100) : 0 };
}

export function creditLine(reframe: Pick<ReframeSettings, 'author'>, domain?: string): string {
    if (reframe.author) return `Sparked by a post from ${reframe.author}.`;
    return domain ? `Sparked by a post I read on ${domain}.` : 'Sparked by a post I read this week.';
}

export function hasCredit(draft: string, line: string): boolean {
    return draft.includes(line);
}
