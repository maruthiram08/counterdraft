import { BrainMetadata } from '@/types';

// Presets are suggestions only: any of these fields can also hold the user's own words
export const GOAL_PRESETS = ['authority', 'engagement', 'conversion', 'connection'];
export const FORMAT_PRESETS = ['thought_leadership', 'tactical_guide', 'personal_story', 'listicle'];

const FORMAT_LABELS: Record<string, string> = {
    thought_leadership: 'Thought Leadership',
    tactical_guide: 'Tactical Guide',
    personal_story: 'Personal Story',
    listicle: 'Listicle',
};

// The fields the brief parser is allowed to set
export type ParsedStrategy = Pick<BrainMetadata, 'audience' | 'stance' | 'format' | 'cta' | 'include' | 'avoid' | 'toneNotes' | 'length' | 'clarifyingQuestion'> & {
    outcome?: BrainMetadata['outcome'];
};

// Older drafts saved 'story' for Personal Story
export function normalizeFormat(format?: string): string | undefined {
    return format === 'story' ? 'personal_story' : format;
}

export function formatLabel(format?: string): string {
    const normalized = normalizeFormat(format) || '';
    return FORMAT_LABELS[normalized] || normalized;
}

export function hasStrategy(meta?: Partial<BrainMetadata>): boolean {
    if (!meta) return false;
    return !!(meta.brief?.trim() || meta.outcome || meta.stance || meta.format || meta.audience?.role);
}

// Builds the strategy block shared by every generation prompt. The brief goes in verbatim so
// nuance like "spicy but not preachy" survives alongside the structured fields.
export function formatStrategyContext(meta?: Partial<BrainMetadata>, heading = 'Strategic Context'): string {
    if (!meta) return '';

    const lines: string[] = [];
    if (meta.outcome) lines.push(`- Goal: ${meta.outcome}`);
    const audience = meta.audience;
    if (audience?.role) {
        const pain = audience.pain ? ` (Pain: ${audience.pain})` : '';
        const beliefs = audience.beliefs ? ` (Already believes: ${audience.beliefs})` : '';
        lines.push(`- Audience: ${audience.role}${pain}${beliefs}`);
    }
    if (meta.stance) lines.push(`- Stance: ${meta.stance}`);
    if (meta.format) lines.push(`- Format: ${formatLabel(meta.format)}`);
    if (meta.toneNotes) lines.push(`- Tone: ${meta.toneNotes}`);
    if (meta.cta) lines.push(`- Call to action: ${meta.cta}`);
    if (meta.length) lines.push(`- Length: ${meta.length}`);
    if (meta.include?.length) lines.push(`- Must include: ${meta.include.join('; ')}`);
    if (meta.avoid?.length) lines.push(`- Avoid: ${meta.avoid.join('; ')}`);

    const brief = meta.brief?.trim()
        ? `\nCreator's brief, in their own words (the source of truth; honour its nuance over the labels above):\n"""\n${meta.brief.trim()}\n"""`
        : '';

    if (!lines.length && !brief) return '';
    return `\n\n${heading}:\n${lines.join('\n')}${brief}`;
}

// Each format has its own skeleton, so a story and a guide on the same topic don't share one essay shape
const FORMAT_SHAPES: Record<string, string> = {
    thought_leadership: `ARGUMENT. Open on the claim or tension → why it matters to this audience now → the evidence that backs it → the strongest objection and the answer to it → what the reader should now think or do. Usually 4-6 sections.`,
    tactical_guide: `GUIDE. The problem and who this is for, in one section → one section per step the reader takes, each naming the concrete action, when and how → the common mistake or when NOT to do this → the next step. Usually 5-8 sections, most of them steps.`,
    personal_story: `STORY. One specific moment or scene → what was at stake → the turn: what happened or what the creator realised → the lesson, said once → what it means for the reader. Usually 4-5 beats. No analysis sections; the research appears as details inside the story.`,
    listicle: `LIST. A one-line setup of why this list matters to this audience → one section per item, each a standalone point with one specific example or number → a short close. Usually 5-9 items. Items are parallel, not steps of an argument.`,
};

const GOAL_SHAPES: Record<string, string> = {
    authority: 'Goal is authority: weight the outline toward evidence and the creator\'s own judgement on it.',
    engagement: 'Goal is engagement: build toward an open question or a position readers will want to answer.',
    conversion: 'Goal is conversion: every section must move the reader toward the call to action; the last section sets it up.',
    connection: 'Goal is connection: lead with the creator\'s own experience and keep the outline personal, not analytical.',
};

// What the outline should look like for this strategy: the format picks the skeleton,
// stance, goal and length decide the opening, the emphasis and how many sections
export function outlineShape(meta?: Partial<BrainMetadata>): string {
    const format = normalizeFormat(meta?.format);
    const shape = format && FORMAT_SHAPES[format]
        ? FORMAT_SHAPES[format]
        : format
            ? `Follow the structure the creator's format implies: "${format}". Pick the skeleton that format calls for, not a generic essay.`
            : 'No format was chosen. Pick the one skeleton (argument, guide, story or list) that best serves the brief and the goal, and commit to it.';

    const lines = [`SHAPE: ${shape}`];
    if (meta?.stance) lines.push(`STANCE "${meta.stance}" decides the opening and the order. A contrarian post opens by naming the belief it challenges; an exploratory one opens with a question and may end without a verdict; a supportive one leads with what is working. Use the stance's own words if it is none of these.`);
    const goal = meta?.outcome ? GOAL_SHAPES[meta.outcome.toLowerCase()] || `Goal: ${meta.outcome}. Order the sections so the post achieves it.` : '';
    if (goal) lines.push(goal);
    if (meta?.length) lines.push(`LENGTH "${meta.length}" decides the number of sections: a short post gets 3-4, a long article can take more.`);
    return lines.join('\n');
}

function cleanString(value: unknown, max = 300): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : undefined;
}

function cleanList(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const items = value.map(v => cleanString(v, 200)).filter((v): v is string => !!v).slice(0, 8);
    return items.length ? items : undefined;
}

// Keeps only well-formed fields from the model's JSON so a bad response can't corrupt brain_metadata
export function sanitizeParsedStrategy(raw: unknown): ParsedStrategy {
    if (!raw || typeof raw !== 'object') return {};
    const r = raw as Record<string, unknown>;
    const result: ParsedStrategy = {};

    const outcome = cleanString(r.outcome, 120);
    if (outcome) result.outcome = GOAL_PRESETS.includes(outcome.toLowerCase()) ? outcome.toLowerCase() : outcome;

    const format = cleanString(r.format, 120);
    if (format) result.format = normalizeFormat(format);

    const stance = cleanString(r.stance, 120);
    if (stance) result.stance = stance;

    if (r.audience && typeof r.audience === 'object') {
        const a = r.audience as Record<string, unknown>;
        const role = cleanString(a.role, 160);
        if (role) {
            result.audience = { role, pain: cleanString(a.pain) || '' };
            const beliefs = cleanString(a.beliefs);
            if (beliefs) result.audience.beliefs = beliefs;
        }
    } else {
        const role = cleanString(r.audience, 160);
        if (role) result.audience = { role, pain: '' };
    }

    const cta = cleanString(r.cta);
    if (cta) result.cta = cta;
    const toneNotes = cleanString(r.toneNotes);
    if (toneNotes) result.toneNotes = toneNotes;
    const length = cleanString(r.length, 120);
    if (length) result.length = length;
    const include = cleanList(r.include);
    if (include) result.include = include;
    const avoid = cleanList(r.avoid);
    if (avoid) result.avoid = avoid;
    const question = cleanString(r.clarifyingQuestion, 200);
    if (question) result.clarifyingQuestion = question;

    return result;
}

// Ideas saved from Explore carry the search in meta.explore; older ones only have it at the top of sourceContext
export function extractOriginQuery(sourceContext?: string): string | undefined {
    const match = sourceContext?.match(/Original Search Query: "([^"]+)"/);
    return match?.[1]?.trim() || undefined;
}

export function originQuery(meta?: Partial<BrainMetadata>): string | undefined {
    return meta?.explore?.query?.trim() || extractOriginQuery(meta?.sourceContext);
}

// The angle the idea was saved with in Explore, falling back to the item's own angle
export function originAngle(angle?: string, meta?: Partial<BrainMetadata>): string | undefined {
    return angle?.trim() || meta?.explore?.idea?.angle?.trim() || undefined;
}

// The Explore results the idea came from, as starting evidence for research
export function formatExploreSources(meta?: Partial<BrainMetadata>): string {
    const sources = meta?.explore?.sources?.filter(s => s.title && s.url) || [];
    if (!sources.length) return '';
    const list = sources.slice(0, 8).map((s, i) => {
        const detail = [s.kind && `(${s.kind})`, s.takeaway || s.summary].filter(Boolean).join(' ');
        const points = s.keyPoints?.length ? `\n${s.keyPoints.map(p => `- ${p}`).join('\n')}` : '';
        return `[E${i + 1}] ${s.title} (${s.source || s.url})${detail ? `\n${detail}` : ''}${points}`;
    }).join('\n\n');
    return `\n\nEXPLORE SOURCES (what the creator found before saving this idea; starting evidence, cite them):\n${list}`;
}

// The idea's whole history, oldest first, so each step builds on the ones before it.
// Later steps refine earlier ones; the brief is the newest and most specific intent.
export function formatIdeaChain({ hook, angle, meta }: { hook: string; angle?: string; meta?: Partial<BrainMetadata> }): string {
    const lines: string[] = [];
    const origin = originQuery(meta);
    if (origin) lines.push(`1. What the creator was originally searching for: "${origin}"`);
    if (meta?.sourceContext || meta?.explore?.sources?.length) lines.push(`${lines.length + 1}. The source material they picked (below)`);
    const savedAngle = originAngle(angle, meta);
    lines.push(`${lines.length + 1}. The idea they saved: "${hook}"${savedAngle ? ` (angle: ${savedAngle})` : ''}`);
    if (meta?.brief?.trim()) lines.push(`${lines.length + 1}. Their brief for this post: "${meta.brief.trim()}"`);
    return `\n\nHOW THIS IDEA CAME TO BE (one connected chain, not separate inputs):\n${lines.join('\n')}`;
}

// Fixed rubric for the strategy check. The model rates each criterion 0-5 and the score is
// computed here, so the same draft gets the same score and a fix moves only the part it touched.
export const STRATEGY_CRITERIA = [
    { key: 'audience', label: 'Audience fit', weight: 25, ask: 'Speaks to the defined audience in their language and addresses their specific pain' },
    { key: 'stance', label: 'Stance & tone', weight: 20, ask: 'Holds the promised stance and tone all the way through' },
    { key: 'goal', label: 'Goal & call to action', weight: 25, ask: 'Drives toward the goal and lands the call to action' },
    { key: 'brief', label: 'Brief requirements', weight: 20, ask: "Covers the brief's must-include points, avoids what it says to avoid, fits the format and length" },
    { key: 'clarity', label: 'Hook & specifics', weight: 10, ask: 'Opens with a hook and uses concrete specifics over generic claims' },
] as const;

export type StrategyCriterionKey = typeof STRATEGY_CRITERIA[number]['key'];

export interface StrategyCriterion {
    key: StrategyCriterionKey;
    label: string;
    rating: number; // 0-5
    points: number;
    max: number;
    note: string;
}

export interface StrategyAnalysis {
    score: number;
    analysis: string;
    suggestions: string[];
    criteria: StrategyCriterion[];
}

// A criterion rated this high has nothing worth an auto-fix
export const STRATEGY_DONE_RATING = 4;

function clampRating(value: unknown): number {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
}

export function scoreCriteria(raw: unknown): StrategyCriterion[] {
    const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return STRATEGY_CRITERIA.map(c => {
        const entry = (data[c.key] && typeof data[c.key] === 'object' ? data[c.key] : { rating: data[c.key] }) as Record<string, unknown>;
        const rating = clampRating(entry.rating);
        return { key: c.key, label: c.label, rating, points: Math.round(rating / 5 * c.weight), max: c.weight, note: String(entry.note || '').trim() };
    });
}

export function totalScore(criteria: StrategyCriterion[]): number {
    return criteria.reduce((sum, c) => sum + c.points, 0);
}

// The criterion to fix next: the one losing the most points, if any is below "done"
export function weakestCriterion(criteria: StrategyCriterion[]): StrategyCriterion | undefined {
    return criteria
        .filter(c => c.rating < STRATEGY_DONE_RATING)
        .sort((a, b) => (b.max - b.points) - (a.max - a.points))[0];
}

// The strategy check returns { score, critique, actionable_fix, criteria }; the panel shows
// { score, analysis, suggestions, criteria } and auto-fixes with the first suggestion.
export function toStrategyAnalysis(raw: unknown): StrategyAnalysis {
    const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const score = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)));
    const analysis = String(data.critique || data.analysis || '').trim();
    const list = (v: unknown) => (Array.isArray(v) ? v : [v]).filter((s): s is string => typeof s === 'string' && !!s.trim()).map(s => s.trim());
    const suggestions = [...new Set([...list(data.actionable_fix), ...list(data.suggestions)])];
    const criteria = Array.isArray(data.criteria) ? data.criteria as StrategyCriterion[] : [];
    return { score, analysis, suggestions, criteria };
}
