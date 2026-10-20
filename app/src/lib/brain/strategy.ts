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
        return `[E${i + 1}] ${s.title} (${s.source || s.url})${detail ? `\n${detail}` : ''}`;
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
