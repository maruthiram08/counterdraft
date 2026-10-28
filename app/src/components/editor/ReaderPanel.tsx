"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import type { BrainMetadata } from "@/types";
import { PANEL_SIZE, Reader, ReaderPanelResult } from "@/lib/editor/readers";

interface ReaderPanelProps {
    content: string;
    brainMetadata?: Partial<BrainMetadata>;
}

/** Asks the reader panel about a draft, optionally comparing openings. Shared by the panel and the Hook lab. */
export async function fetchReaders(body: { draft: string; brainMetadata?: Partial<BrainMetadata>; readers?: Reader[]; openings?: string[] }): Promise<ReaderPanelResult> {
    const res = await fetch('/api/content/readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not ask the readers');
    return data;
}

// A few imagined readers from the post's audience say whether they'd read on, what they think and where they drift off
export function ReaderPanel({ content, brainMetadata }: ReaderPanelProps) {
    const [loading, setLoading] = useState(false);
    // The readers' answers and the text they read
    const [panel, setPanel] = useState<{ text: string; result: ReaderPanelResult } | null>(null);
    const stale = !!panel && panel.text !== content;
    const tooShort = content.trim().length < 80;
    const readOn = panel?.result.readers.filter(r => r.readsOn).length ?? 0;

    const ask = async (sameReaders: boolean) => {
        setLoading(true);
        try {
            const readers = sameReaders ? panel?.result.readers.map(({ name, who }) => ({ name, who })) : undefined;
            setPanel({ text: content, result: await fetchReaders({ draft: content, brainMetadata, readers }) });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not ask the readers');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-soft max-w-xl">
                    {PANEL_SIZE} imagined readers from your audience react to the post. They are AI, so treat this as a second opinion, not a forecast of reach.
                </p>
                <div className="flex flex-wrap gap-2">
                    {panel && (
                        <button
                            onClick={() => ask(false)}
                            disabled={loading || tooShort}
                            className="h-11 md:h-9 px-4 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all disabled:opacity-50"
                        >
                            New readers
                        </button>
                    )}
                    <button
                        onClick={() => ask(!!panel)}
                        disabled={loading || tooShort}
                        className="flex items-center gap-1.5 h-11 md:h-9 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : panel ? <RefreshCw size={12} /> : <Users size={12} />}
                        {loading ? 'Asking...' : panel ? 'Ask them again' : 'Ask readers'}
                    </button>
                </div>
            </div>

            {tooShort && !panel && <p className="text-xs text-ink-muted">Write a little more, then ask the readers.</p>}

            {panel && (
                <>
                    <div className={`flex items-center justify-between rounded-tile px-5 py-3 shadow-raised ${readOn * 2 > panel.result.readers.length ? 'text-sage-700 bg-sage-100' : 'text-sand-700 bg-sand-100'}`}>
                        <span className="text-sm font-medium opacity-80">Would click &ldquo;see more&rdquo;</span>
                        <span className="text-2xl font-medium tracking-[-0.03em] tabular-nums">{readOn} of {panel.result.readers.length}</span>
                    </div>
                    {stale && (
                        <p className="text-xs text-ink-muted">The post changed since they read it. &ldquo;Ask them again&rdquo; has the same readers read the new version.</p>
                    )}
                    <ul className="grid gap-3 md:grid-cols-2">
                        {panel.result.readers.map(r => (
                            <li key={r.name} className="flex flex-col gap-2 bg-canvas shadow-well rounded-2xl p-4 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink">{r.name}</p>
                                        <p className="text-xs text-ink-muted">{r.who}</p>
                                    </div>
                                    <span className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full ${r.readsOn ? 'text-sage-700 bg-sage-100' : 'text-rose-700 bg-rose-100'}`}>
                                        {r.readsOn ? 'Reads on' : 'Scrolls past'}
                                    </span>
                                </div>
                                <p className="text-sm text-ink-soft">&ldquo;{r.reaction}&rdquo;</p>
                                {r.comment && (
                                    <p className="text-xs text-ink-soft"><span className="text-ink-muted">Would comment: </span>{r.comment}</p>
                                )}
                                {r.lostAt && (
                                    <p className="text-xs text-ink-soft"><span className="text-ink-muted">Lost interest at: </span>&ldquo;{r.lostAt}&rdquo;</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
