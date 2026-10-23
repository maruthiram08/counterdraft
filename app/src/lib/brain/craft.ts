// Writing quality for drafts: the writer's own posts as style examples, and the self-edit pass's checklist.
// Kept free of the OpenAI client so the selection and guard logic can be tested on their own.
import { AntiSlopService } from '@/lib/tools/anti-slop';
import { keyWords } from './webResearch';

export interface PastPost {
    text: string;
    date?: string | null;
}

export const MAX_STYLE_EXAMPLES = 3;
const MIN_EXAMPLE_LENGTH = 200;
const MAX_EXAMPLE_LENGTH = 1500;

function clean(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Picks the writer's own posts that show how they write: closest to this topic first, then most recent.
 * Very short posts (a link and a line) say little about style, so they are skipped.
 */
export function pickStyleExamples(posts: PastPost[], topic: string, max = MAX_STYLE_EXAMPLES): string[] {
    const topicWords = new Set(keyWords(topic));
    const seen = new Set<string>();
    const scored = posts
        .map((p, i) => ({ text: clean(p.text || ''), date: p.date ? Date.parse(p.date) : NaN, i }))
        .filter(p => p.text.length >= MIN_EXAMPLE_LENGTH)
        .filter(p => {
            const key = p.text.slice(0, 120).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map(p => ({ ...p, overlap: keyWords(p.text).filter(w => topicWords.has(w)).length }));

    scored.sort((a, b) =>
        b.overlap - a.overlap
        || (Number.isNaN(b.date) ? 0 : b.date) - (Number.isNaN(a.date) ? 0 : a.date)
        || a.i - b.i);

    return scored.slice(0, max).map(p =>
        p.text.length > MAX_EXAMPLE_LENGTH ? `${p.text.slice(0, MAX_EXAMPLE_LENGTH).trimEnd()}…` : p.text);
}

/** For the draft prompt: how this writer sounds, without handing over what they said. */
export function formatStyleExamples(examples: string[]): string {
    if (!examples.length) return '';
    const posts = examples.map((e, i) => `--- Post ${i + 1} ---\n${e}`).join('\n\n');
    return `\n\nHOW THIS CREATOR ACTUALLY WRITES (their own past posts):
${posts}
--- End of past posts ---
Match how these read: how they open, sentence length and rhythm, line breaks, how plain or formal the words are, how they use "I", and how they end. Do not reuse their topics, claims, stories or exact phrases; only the way they write.`;
}

// LinkedIn shows about this many characters before "see more"
export const SEE_MORE_CHARS = 210;

/** The self-edit pass's instructions, with any flagged words the jargon scan found in this draft. */
export function selfEditChecklist(draft: string): string {
    const flagged = [...new Set(AntiSlopService.scan(draft).map(m => m.word.toLowerCase()))];
    const flaggedLine = flagged.length
        ? `\n- These words were flagged in this draft; replace or cut each one: ${flagged.map(w => `"${w}"`).join(', ')}`
        : '';
    return `- The opening (the first ${SEE_MORE_CHARS} characters, before LinkedIn's "see more") must make a specific reader want the rest: a concrete claim, moment, number or tension. No throat-clearing, no "In today's world", no question that only sets up the post.
- Cut filler and repetition: sentences that restate the one before, "it's important to note", "let's dive in", "here's the thing", "at the end of the day".
- Cut hedging the stance doesn't call for ("perhaps", "arguably", "in some ways"), and hype it can't back up ("game-changer", "revolutionary").
- Replace vague claims with the specific detail already in the draft; never invent one.
- Prefer plain words and active verbs. Break up any sentence over about 30 words.
- No "It's not X, it's Y" constructions, no rhetorical triplets used for rhythm, no em-dash chains, no closing line that asks readers to comment or share unless it is the call to action.${flaggedLine}`;
}

/**
 * Guards the self-edit: an edit that comes back empty, gutted, ballooned, or missing the creator's
 * [placeholders] is worse than no edit, so the original draft stands.
 */
export function acceptSelfEdit(original: string, edited: string | null | undefined): string {
    const next = (edited || '').trim();
    if (!next) return original;
    const ratio = next.length / Math.max(1, original.trim().length);
    if (ratio < 0.6 || ratio > 1.3) return original;
    const placeholders = original.match(/\[[^\]\n]{3,}\]/g) || [];
    if (placeholders.some(p => !next.includes(p))) return original;
    return next;
}
