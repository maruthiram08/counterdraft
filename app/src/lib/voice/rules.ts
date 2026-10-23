// Keeping a voice profile's rules usable as it learns: no duplicates, a cap, and a record of where each rule came from.
// Client-safe: the Your Voice page reads the same helpers.

export const MAX_RULES = 20;

export type RuleSource = 'edit' | 'analysis' | 'manual';

export interface RuleOrigin {
    source: RuleSource;
    at: string;   // ISO date it was added
    why?: string; // for rules learned from edits: what the writer changed
}

/** Lowercase, no punctuation or extra spaces: two rules that differ only in those are the same rule. */
export function ruleKey(rule: string): string {
    return rule.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

/** Drops empty rules and exact repeats, keeping the first of each. */
export function dedupeRules(rules: string[]): string[] {
    const seen = new Set<string>();
    return rules
        .map(r => (typeof r === 'string' ? r.trim() : ''))
        .filter(r => {
            const key = ruleKey(r);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

/**
 * Adds newly learned rules to a list: repeats are skipped, and past the cap the oldest
 * learned rules make room, so rules the writer set up themselves are the last to go.
 */
export function addRules(current: string[], added: string[], origins: Record<string, RuleOrigin> = {}, max = MAX_RULES): string[] {
    const merged = dedupeRules([...current, ...added]);
    if (merged.length <= max) return merged;
    const learned = merged
        .map((r, i) => ({ r, i, origin: origins[r] }))
        .filter(x => x.origin?.source === 'edit' && !added.includes(x.r))
        .sort((a, b) => (a.origin!.at < b.origin!.at ? -1 : 1));
    const drop = new Set(learned.slice(0, merged.length - max).map(x => x.r));
    const kept = merged.filter(r => !drop.has(r));
    // Still over when everything left was set up by hand: keep the newest
    return kept.slice(Math.max(0, kept.length - max));
}

/** Reads the origins map stored in workflow_preferences, keeping only well-formed entries. */
export function cleanOrigins(raw: unknown): Record<string, RuleOrigin> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, RuleOrigin> = {};
    for (const [rule, v] of Object.entries(raw as Record<string, unknown>)) {
        const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
        if ((o.source === 'edit' || o.source === 'analysis' || o.source === 'manual') && typeof o.at === 'string') {
            out[rule] = { source: o.source, at: o.at, ...(typeof o.why === 'string' && o.why ? { why: o.why.slice(0, 300) } : {}) };
        }
    }
    return out;
}

export interface RuleMerge {
    into: string;
    from: string[];
}

export interface RuleConflict {
    a: string;
    b: string;
    why: string;
}

export interface TidyProposal {
    rules: string[];
    anti_patterns: string[];
    merged: RuleMerge[];
    conflicts: RuleConflict[];
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v: unknown) => (Array.isArray(v) ? v.map(x => str(x)).filter(Boolean) : []);

/**
 * Keeps the model's tidy-up only where it is safe: lists are deduped and capped, and if a list came
 * back empty while the original wasn't, the original stands rather than wiping the writer's rules.
 */
export function parseTidy(raw: unknown, original: { rules: string[]; anti_patterns: string[] }): TidyProposal {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rules = dedupeRules(strList(r.rules));
    const anti = dedupeRules(strList(r.anti_patterns));
    const merged = (Array.isArray(r.merged) ? r.merged : [])
        .map(m => (m && typeof m === 'object' ? m : {}) as Record<string, unknown>)
        .map(m => ({ into: str(m.into), from: strList(m.from) }))
        .filter(m => m.into && m.from.length >= 2);
    const conflicts = (Array.isArray(r.conflicts) ? r.conflicts : [])
        .map(c => (c && typeof c === 'object' ? c : {}) as Record<string, unknown>)
        .map(c => ({ a: str(c.a), b: str(c.b), why: str(c.why, 200) }))
        .filter(c => c.a && c.b);
    return {
        rules: (rules.length || !original.rules.length ? rules : dedupeRules(original.rules)).slice(0, MAX_RULES),
        anti_patterns: (anti.length || !original.anti_patterns.length ? anti : dedupeRules(original.anti_patterns)).slice(0, MAX_RULES),
        merged,
        conflicts,
    };
}
