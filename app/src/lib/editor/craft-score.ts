// The craft score: how well the post is written, apart from whether it fits the strategy.
// Hook and specifics need judgement, so the model rates them. Readability and rhythm are measured
// here from the text, so they are instant, free, and the same draft always gets the same rating.
import { AntiSlopService } from '@/lib/tools/anti-slop';

export const CRAFT_CRITERIA = [
    { key: 'hook', label: 'Hook', weight: 30, ask: 'The opening (before LinkedIn\'s "see more") makes a specific reader want the rest: a concrete claim, moment, number or tension, no throat-clearing' },
    { key: 'specifics', label: 'Specifics', weight: 30, ask: 'Claims are backed by concrete detail (names, numbers, examples, moments) rather than generic statements' },
    { key: 'readability', label: 'Readability', weight: 20, ask: 'Short sentences and paragraphs, plain words, no jargon' },
    { key: 'rhythm', label: 'Rhythm', weight: 20, ask: 'Sentence lengths vary and sentences don\'t keep starting the same way' },
] as const;

export type CraftKey = typeof CRAFT_CRITERIA[number]['key'];
export type ModelCraftKey = 'hook' | 'specifics';

export interface CraftCriterion {
    key: CraftKey;
    label: string;
    rating: number; // 0-5
    points: number;
    max: number;
    note: string;
    // What "Fix this" asks the editor to do; empty when there is nothing worth fixing
    fix: string;
}

export interface CraftScore {
    score: number;
    criteria: CraftCriterion[];
}

// A criterion rated this high has nothing worth a fix
export const CRAFT_DONE_RATING = 4;
const LONG_SENTENCE_WORDS = 30;
const LONG_PARAGRAPH_WORDS = 70;

export interface TextStats {
    sentences: string[];
    lengths: number[];
    avgWords: number;
    longSentences: string[];
    longParagraphs: number;
    jargon: string[];
    repeatedOpener?: { word: string; count: number };
    variation: number; // coefficient of variation of sentence length
    shortSentences: number;
}

function words(text: string): string[] {
    return text.match(/[\p{L}\p{N}'’-]+/gu) || [];
}

export function splitSentences(text: string): string[] {
    return text
        .replace(/\[[^\]\n]*\]/g, ' ') // placeholders aren't the writer's sentences yet
        .replace(/([.!?…])\s+/g, '$1\n')
        .split(/\n+/)
        .map(s => s.replace(/^[\s\-*•\d.)]+/, '').trim())
        .filter(s => words(s).length > 0);
}

export function measureText(text: string): TextStats {
    const sentences = splitSentences(text);
    const lengths = sentences.map(s => words(s).length);
    const total = lengths.reduce((a, b) => a + b, 0);
    const avgWords = lengths.length ? total / lengths.length : 0;
    const variance = lengths.length ? lengths.reduce((sum, n) => sum + (n - avgWords) ** 2, 0) / lengths.length : 0;

    const openers = new Map<string, number>();
    for (const s of sentences) {
        const first = words(s)[0]?.toLowerCase();
        if (first) openers.set(first, (openers.get(first) || 0) + 1);
    }
    const [topWord, topCount] = [...openers.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];

    return {
        sentences,
        lengths,
        avgWords,
        longSentences: sentences.filter((_, i) => lengths[i] > LONG_SENTENCE_WORDS),
        longParagraphs: text.split(/\n\s*\n/).filter(p => words(p).length > LONG_PARAGRAPH_WORDS).length,
        jargon: [...new Set(AntiSlopService.scan(text).map(m => m.word.toLowerCase()))],
        repeatedOpener: topCount >= 3 && topCount / Math.max(1, sentences.length) >= 0.25 ? { word: topWord, count: topCount } : undefined,
        variation: avgWords ? Math.sqrt(variance) / avgWords : 0,
        shortSentences: lengths.filter(n => n <= 6).length,
    };
}

function quote(s: string, max = 90): string {
    return `"${s.length > max ? `${s.slice(0, max).trimEnd()}…` : s}"`;
}

function rated(key: CraftKey, rating: number, note: string, fix: string): CraftCriterion {
    const c = CRAFT_CRITERIA.find(k => k.key === key)!;
    const r = Math.max(0, Math.min(5, Math.round(rating)));
    return { key, label: c.label, rating: r, points: Math.round(r / 5 * c.weight), max: c.weight, note, fix: r < CRAFT_DONE_RATING ? fix : '' };
}

export function rateReadability(stats: TextStats): CraftCriterion {
    if (!stats.sentences.length) return rated('readability', 0, 'No sentences to read yet.', '');
    let rating = 5;
    const problems: string[] = [];
    const fixes: string[] = [];
    if (stats.avgWords > 26) { rating -= 2; problems.push(`sentences average ${Math.round(stats.avgWords)} words`); }
    else if (stats.avgWords > 20) { rating -= 1; problems.push(`sentences average ${Math.round(stats.avgWords)} words`); }
    if (stats.longSentences.length) {
        rating -= Math.min(2, stats.longSentences.length);
        problems.push(`${stats.longSentences.length} sentence${stats.longSentences.length === 1 ? '' : 's'} over ${LONG_SENTENCE_WORDS} words`);
        fixes.push(`Split these long sentences: ${stats.longSentences.slice(0, 3).map(s => quote(s)).join('; ')}.`);
    }
    if (stats.longParagraphs) {
        rating -= 1;
        problems.push(`${stats.longParagraphs} dense paragraph${stats.longParagraphs === 1 ? '' : 's'}`);
        fixes.push('Break paragraphs over about 70 words into shorter ones, as LinkedIn readers skim on phones.');
    }
    if (stats.jargon.length >= 2) {
        rating -= 1;
        problems.push(`jargon (${stats.jargon.slice(0, 3).join(', ')})`);
        fixes.push(`Replace these words with plain ones: ${stats.jargon.map(w => `"${w}"`).join(', ')}.`);
    }
    if (stats.avgWords > 20 && !stats.longSentences.length) fixes.push('Shorten the longest sentences so most are under 20 words.');
    const note = problems.length
        ? `${problems.join(', ')}.`.replace(/^./, c => c.toUpperCase())
        : `Easy to read: sentences average ${Math.round(stats.avgWords)} words.`;
    return rated('readability', rating, note, fixes.join(' '));
}

export function rateRhythm(stats: TextStats): CraftCriterion {
    if (stats.sentences.length < 4) return rated('rhythm', 4, 'Too short to judge rhythm.', '');
    let rating = 5;
    const problems: string[] = [];
    const fixes: string[] = [];
    if (stats.variation < 0.3) {
        rating -= 2;
        problems.push('most sentences are the same length');
        fixes.push('Vary sentence length: follow a long sentence with a short one, and land key points in a line of a few words.');
    } else if (stats.variation < 0.42) {
        rating -= 1;
        problems.push('sentence lengths vary only a little');
        fixes.push('Add a few short, punchy sentences among the longer ones.');
    }
    if (stats.repeatedOpener) {
        rating -= 1;
        problems.push(`${stats.repeatedOpener.count} sentences start with "${stats.repeatedOpener.word}"`);
        fixes.push(`Reword some of the sentences that start with "${stats.repeatedOpener.word}" so they open differently.`);
    }
    if (stats.sentences.length >= 8 && stats.shortSentences === 0) {
        rating -= 1;
        problems.push('no short sentences');
        if (!fixes.length) fixes.push('Add one or two short sentences (six words or fewer) where a point should land.');
    }
    const note = problems.length ? `${problems.join(', ')}.`.replace(/^./, c => c.toUpperCase()) : 'Sentence lengths vary well.';
    return rated('rhythm', rating, note, fixes.join(' '));
}

/** Combines the model's hook and specifics ratings with the measured readability and rhythm. */
export function scoreCraft(modelRaw: unknown, text: string): CraftScore {
    const data = (modelRaw && typeof modelRaw === 'object' ? modelRaw : {}) as Record<string, unknown>;
    const fromModel = (key: ModelCraftKey): CraftCriterion => {
        const entry = (data[key] && typeof data[key] === 'object' ? data[key] : {}) as Record<string, unknown>;
        const rating = Number(entry.rating);
        const note = String(entry.note || '').trim().slice(0, 300);
        const fix = String(entry.fix || '').trim().slice(0, 500);
        return rated(key, Number.isFinite(rating) ? rating : 0, note, fix || note);
    };
    const stats = measureText(text);
    const criteria = [fromModel('hook'), fromModel('specifics'), rateReadability(stats), rateRhythm(stats)];
    return { score: criteria.reduce((sum, c) => sum + c.points, 0), criteria };
}

/** Trusts only the shape the client should send back: a known criterion and a short instruction. */
export function cleanCraftFix(raw: unknown): { key: CraftKey; fix: string } | null {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const c = CRAFT_CRITERIA.find(k => k.key === r.key);
    const fix = typeof r.fix === 'string' ? r.fix.trim().slice(0, 800) : '';
    return c && fix ? { key: c.key, fix } : null;
}
