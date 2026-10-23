// "Surprise me": one strong story from outside the writer's usual areas that they could still own.

export interface SurprisePick {
    label: string;
    query: string;
    // Why this writer in particular could say something about it
    why: string;
}

function text(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const clean = value.replace(/\s+/g, ' ').trim();
    return clean ? clean.slice(0, max) : null;
}

/** Keeps a pick only if it names a topic, a search for it and a reason, and isn't one of the usual areas. */
export function parseSurprise(raw: unknown, usual: string[]): SurprisePick | null {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const label = text(r.label, 60);
    const query = text(r.query, 120);
    const why = text(r.why, 240);
    if (!label || !query || !why) return null;
    const lower = label.toLowerCase();
    if (usual.some(u => u.trim() && lower === u.trim().toLowerCase())) return null;
    return { label, query, why };
}
