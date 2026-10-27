"use client";

import { useState } from "react";
import { ExternalLink, X, ChevronDown } from "lucide-react";
import type { ExploreOrigin } from "@/types";
import { INTENT_LABELS, intentChipClass } from "@/components/brain/intentChip";

type CaptureSource = ExploreOrigin['sources'][number];

interface CaptureSourcesStripProps {
    sources: CaptureSource[];
    // The post a reframe reacts to; it can't be taken out
    lockedId?: string;
    disabled?: boolean;
    onRemove: (captureId: string) => void;
}

// The Lens captures this post is built from, with what the writer thinks of each, so they can check
// what research, outline and draft are using and drop one that doesn't belong
export function CaptureSourcesStrip({ sources, lockedId, disabled, onRemove }: CaptureSourcesStripProps) {
    const [openId, setOpenId] = useState<string | null>(null);
    const open = sources.find(s => s.captureId === openId);
    // The last capture stays: without it the post loses what it responds to
    const canRemove = (s: CaptureSource) => sources.length > 1 && s.captureId !== lockedId;

    return (
        <section aria-label="Your captures" className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                <span className="shrink-0 text-xs font-medium text-ink-muted">
                    {sources.length === 1 ? 'From your capture' : `From ${sources.length} captures`}
                </span>
                {sources.map(s => {
                    const active = s.captureId === openId;
                    return (
                        <button
                            key={s.captureId}
                            type="button"
                            onClick={() => setOpenId(active ? null : s.captureId!)}
                            aria-expanded={active}
                            className={`shrink-0 h-11 pl-1.5 pr-3 rounded-full flex items-center gap-2 max-w-[240px] text-sm transition-all ${active ? 'bg-surface shadow-pressed text-ink' : 'bg-canvas shadow-raised text-ink-soft hover:text-ink'}`}
                        >
                            {s.image ? (
                                // eslint-disable-next-line @next/next/no-img-element -- stored capture, any size
                                <img src={s.image} alt="" className="w-8 h-8 rounded-full object-cover object-top shrink-0" />
                            ) : (
                                <span className="w-8 h-8 rounded-full bg-surface-muted shrink-0" aria-hidden="true" />
                            )}
                            <span className="truncate">{s.author || s.source || s.title}</span>
                            {s.intent && (
                                <span className={`shrink-0 h-6 leading-6 px-2 rounded-full text-[11px] font-medium ${intentChipClass(s.intent)}`}>
                                    {INTENT_LABELS[s.intent]}
                                </span>
                            )}
                            <ChevronDown size={14} className={`shrink-0 transition-transform ${active ? 'rotate-180' : ''}`} />
                        </button>
                    );
                })}
            </div>

            {open && (
                <div className="bg-surface rounded-tile shadow-card p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{open.title}</p>
                            {open.source && <p className="text-xs text-ink-muted truncate">{open.author ? `${open.author} · ` : ''}{open.source}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpenId(null)}
                            aria-label="Close"
                            className="w-11 h-11 -mr-2 -mt-2 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:text-ink"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {open.note && <p className="text-sm text-ink italic">&quot;{open.note}&quot;</p>}
                    {open.image && (
                        <a href={open.image} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden bg-surface-muted max-h-48" title="Open the full image">
                            {/* eslint-disable-next-line @next/next/no-img-element -- stored capture, any size */}
                            <img src={open.image} alt={`Capture from ${open.source || 'a page'}`} className="w-full h-auto object-cover object-top" />
                        </a>
                    )}
                    {open.text && (
                        <p className="text-sm text-ink-soft leading-relaxed bg-surface-muted p-3 rounded-2xl whitespace-pre-line max-h-48 overflow-y-auto">{open.text}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        {open.url && (
                            <a
                                href={open.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-11 px-3 rounded-full text-sm text-ink-soft hover:text-ember-600 flex items-center gap-1.5"
                            >
                                <ExternalLink size={14} /> Open source
                            </a>
                        )}
                        <div className="flex-1" />
                        {canRemove(open) && (
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                    onRemove(open.captureId!);
                                    setOpenId(null);
                                }}
                                className="h-11 px-4 rounded-full bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-rose-700 active:shadow-pressed transition-all disabled:opacity-50"
                            >
                                Don&apos;t use in this post
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
