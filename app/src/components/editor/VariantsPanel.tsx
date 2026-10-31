"use client";

import { useState } from "react";
import { Layers, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { BrainMetadata } from "@/types";
import { DraftVariant, VARIANT_LABELS } from "@/lib/editor/draft-tools";
import { Spinner } from "@/components/shared/Loading";

interface VariantsPanelProps {
    content: string;
    brainMetadata?: Partial<BrainMetadata>;
    onApply: (content: string) => void;
    disabled?: boolean;
}

// The finished draft three other ways (shorter, punchier, more personal) to compare and pick from
export function VariantsPanel({ content, brainMetadata, onApply, disabled }: VariantsPanelProps) {
    const [loading, setLoading] = useState(false);
    const [variants, setVariants] = useState<DraftVariant[] | null>(null);
    // Undo is offered only while the post is still exactly as the swap left it
    const [swap, setSwap] = useState<{ before: string; after: string } | null>(null);
    const canUndo = swap !== null && swap.after === content;

    const run = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'variants', draft: content, brainMetadata }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not make variants');
            if (!data.variants?.length) throw new Error('No variants came back. Try again.');
            setVariants(data.variants);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not make variants');
        } finally {
            setLoading(false);
        }
    };

    const use = (text: string) => {
        setSwap({ before: canUndo ? swap.before : content, after: text });
        onApply(text);
        toast.success('Variant swapped in');
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-soft">See this draft shorter, punchier, or more personal, and keep the one you like.</p>
                <div className="flex gap-2">
                    {canUndo && (
                        <button onClick={() => { onApply(swap.before); setSwap(null); }} className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                            <RotateCcw size={12} /> Back to my draft
                        </button>
                    )}
                    <button
                        onClick={run}
                        disabled={loading || disabled || content.trim().length < 80}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        {loading ? <Spinner size={12} /> : <Layers size={12} />}
                        {variants ? 'Make new variants' : 'Make variants'}
                    </button>
                </div>
            </div>

            {variants && (
                <ul className="grid gap-3 md:grid-cols-3">
                    {variants.map(v => (
                        <li key={v.kind} className="flex flex-col gap-2 bg-canvas shadow-well rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium uppercase tracking-wide text-ember-700">{VARIANT_LABELS[v.kind]}</span>
                                <span className="text-[11px] text-ink-muted">{v.text.length.toLocaleString()} chars</span>
                            </div>
                            <p className="text-sm text-ink whitespace-pre-wrap max-h-72 overflow-y-auto flex-1">{v.text}</p>
                            <button
                                onClick={() => use(v.text)}
                                disabled={disabled}
                                className="self-start h-8 px-3 rounded-full bg-surface shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                            >
                                Use this
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
