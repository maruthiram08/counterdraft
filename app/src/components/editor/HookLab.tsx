"use client";

import { useState } from "react";
import { RotateCcw, Users, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { BrainMetadata } from "@/types";
import { OpeningsResult, replaceOpening, seeMoreCut, splitOpening } from "@/lib/editor/openings";
import { openingVotes } from "@/lib/editor/readers";
import { fetchReaders } from "./ReaderPanel";
import { Spinner } from "@/components/shared/Loading";

interface HookLabProps {
    content: string;
    brainMetadata?: Partial<BrainMetadata>;
    onApply: (content: string) => void;
    disabled?: boolean;
}

function Votes({ votes, of }: { votes: number; of: number }) {
    return (
        <p className="flex items-center gap-1.5 text-xs text-ink-soft" title="Imagined readers from your audience, not a forecast">
            <Users size={12} className="text-ink-muted" /> {votes} of {of} readers would click &ldquo;see more&rdquo;
        </p>
    );
}

function Rating({ value }: { value: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`} title="How likely a reader clicks see more">
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= value ? 'bg-ember-500' : 'bg-line'}`} />
            ))}
        </span>
    );
}

// Three other ways to open the post, each rated on whether it earns the "see more" click
export function HookLab({ content, brainMetadata, onApply, disabled }: HookLabProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OpeningsResult | null>(null);
    // The post before and after the last swap. Undo is offered only while the post is still as the swap left it,
    // so it never throws away edits made since.
    const [swap, setSwap] = useState<{ before: string; after: string } | null>(null);
    const canUndo = swap !== null && swap.after === content;
    const current = splitOpening(content).opening;
    // Reader votes per opening: index 0 is the opening the post had when asked, then the options in order
    const [votes, setVotes] = useState<{ result: OpeningsResult; opening: string; counts: number[]; of: number } | null>(null);
    const [asking, setAsking] = useState(false);
    const shownVotes = votes && votes.result === result ? votes : null;

    const run = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/content/openings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draft: content, brainMetadata }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not get openings');
            setResult(data);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not get openings');
        } finally {
            setLoading(false);
        }
    };

    const askReaders = async () => {
        if (!result) return;
        setAsking(true);
        try {
            const openings = [current, ...result.options.map(o => o.text)];
            const panel = await fetchReaders({ draft: content, brainMetadata, openings });
            setVotes({ result, opening: current, counts: openingVotes(panel, openings.length), of: panel.readers.length });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not ask the readers');
        } finally {
            setAsking(false);
        }
    };

    const voteFor = (text: string) => {
        if (!shownVotes || !result) return null;
        if (text === shownVotes.opening) return shownVotes.counts[0];
        const i = result.options.findIndex(o => o.text === text);
        return i >= 0 ? shownVotes.counts[i + 1] : null;
    };
    const currentVotes = voteFor(current);

    const use = (text: string) => {
        const after = replaceOpening(content, text);
        setSwap({ before: canUndo ? swap.before : content, after });
        onApply(after);
        toast.success('Opening swapped in');
    };

    const undo = () => {
        if (!canUndo) return;
        onApply(swap.before);
        setSwap(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-muted mb-1">Your opening now</p>
                    <p className="text-sm text-ink whitespace-pre-wrap">{current || 'Nothing yet'}</p>
                    {result?.current && (
                        <p className="mt-1.5 flex items-center gap-2 text-xs text-ink-soft"><Rating value={result.current.rating} /> {result.current.note}</p>
                    )}
                    {currentVotes !== null && <div className="mt-1"><Votes votes={currentVotes} of={shownVotes!.of} /></div>}
                </div>
                <div className="flex gap-2 shrink-0">
                    {canUndo && (
                        <button onClick={undo} className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                            <RotateCcw size={12} /> Put back the original
                        </button>
                    )}
                    <button
                        onClick={run}
                        disabled={loading || disabled || content.trim().length < 80}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        {loading ? <Spinner size={12} /> : <Wand2 size={12} />}
                        {result ? 'Try 3 more' : 'Try 3 other openings'}
                    </button>
                </div>
            </div>

            {result && (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={askReaders}
                        disabled={asking || loading}
                        className="flex items-center gap-1.5 h-11 md:h-9 px-4 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        {asking ? <Spinner size={12} /> : <Users size={12} />}
                        {asking ? 'Asking...' : shownVotes ? 'Ask other readers' : 'Ask readers which they\'d open'}
                    </button>
                    {shownVotes && <span className="text-[11px] text-ink-muted">Imagined readers from your audience. A second opinion, not a forecast.</span>}
                </div>
            )}

            {result && (
                <ul className="grid gap-3 md:grid-cols-3">
                    {result.options.map(o => {
                        const phone = seeMoreCut(o.text, 'phone');
                        return (
                            <li key={o.text} className="flex flex-col gap-2 bg-canvas shadow-well rounded-2xl p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium uppercase tracking-wide text-ember-700">{o.style || 'Opening'}</span>
                                    <Rating value={o.rating} />
                                </div>
                                <p className="text-sm text-ink whitespace-pre-wrap flex-1">{o.text}</p>
                                {phone.truncated && (
                                    <p className="text-[11px] text-sand-700">Runs past &ldquo;see more&rdquo; on a phone</p>
                                )}
                                {o.why && <p className="text-xs text-ink-soft">{o.why}</p>}
                                {voteFor(o.text) !== null && <Votes votes={voteFor(o.text)!} of={shownVotes!.of} />}
                                <button
                                    onClick={() => use(o.text)}
                                    disabled={disabled}
                                    className="self-start h-8 px-3 rounded-full bg-surface shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                                >
                                    Use this
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
