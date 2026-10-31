"use client";

import { useMemo, useState } from "react";
import { Gauge, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { BrainMetadata } from "@/types";
import { CRAFT_DONE_RATING, CraftCriterion, CraftScore, measureText, rateReadability, rateRhythm } from "@/lib/editor/craft-score";
import { Spinner } from "@/components/shared/Loading";

interface CraftScorePanelProps {
    content: string;
    brainMetadata?: Partial<BrainMetadata>;
    onApply: (content: string) => void;
    disabled?: boolean;
}

function scoreColor(score: number) {
    if (score >= 80) return 'text-sage-700 bg-sage-100';
    if (score >= 60) return 'text-sand-700 bg-sand-100';
    return 'text-rose-700 bg-rose-100';
}

function Dots({ value }: { value: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= value ? 'bg-ember-500' : 'bg-line'}`} />
            ))}
        </span>
    );
}

async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/content/develop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
}

// How well the post is written: hook, specifics, readability and rhythm, with a fix for any one of them.
// Readability and rhythm are measured as you type; hook and specifics are rated when you check.
export function CraftScorePanel({ content, brainMetadata, onApply, disabled }: CraftScorePanelProps) {
    const [checking, setChecking] = useState(false);
    const [fixing, setFixing] = useState<string | null>(null);
    // The model's ratings and the text they were made for
    const [check, setCheck] = useState<{ text: string; result: CraftScore } | null>(null);
    // Undo is offered only while the post is still exactly as the fix left it
    const [swap, setSwap] = useState<{ before: string; after: string } | null>(null);
    const canUndo = swap !== null && swap.after === content;

    const live = useMemo(() => {
        const stats = measureText(content);
        return [rateReadability(stats), rateRhythm(stats)];
    }, [content]);
    const judged = check?.result.criteria.filter(c => c.key === 'hook' || c.key === 'specifics') || [];
    const criteria: CraftCriterion[] = check ? [...judged, ...live] : live;
    const score = check ? criteria.reduce((sum, c) => sum + c.points, 0) : null;
    const stale = !!check && check.text !== content;
    const tooShort = content.trim().length < 80;

    const rate = async (text: string, previous?: CraftScore) => {
        const data = await post({
            action: 'craft_score',
            draft: text,
            previous: previous?.criteria.map(c => ({ key: c.key, rating: c.rating, note: c.note })),
        });
        return data as CraftScore;
    };

    const runCheck = async () => {
        setChecking(true);
        try {
            setCheck({ text: content, result: await rate(content, check?.result) });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not check the craft');
        } finally {
            setChecking(false);
        }
    };

    const fix = async (c: CraftCriterion) => {
        setFixing(c.key);
        try {
            const before = { text: content, result: check && !stale ? check.result : await rate(content, check?.result) };
            const data = await post({ action: 'craft_fix', draft: content, fix: { key: c.key, fix: c.fix }, brainMetadata });
            const next = typeof data.draft === 'string' ? data.draft : '';
            if (!next || next.trim() === content.trim()) {
                setCheck(before);
                toast.info('The editor found nothing safe to change there. Try editing it by hand.');
                return;
            }
            const after = await rate(next, before.result);
            if (after.score < before.result.score) {
                setCheck(before);
                toast.info(`That fix scored ${after.score}, lower than ${before.result.score}, so your post is kept as it was`);
                return;
            }
            const was = before.result.criteria.find(k => k.key === c.key);
            const now = after.criteria.find(k => k.key === c.key);
            setSwap({ before: canUndo ? swap.before : content, after: next });
            setCheck({ text: next, result: after });
            onApply(next);
            toast.success(was && now ? `${c.label}: ${was.rating}/5 → ${now.rating}/5 (score ${before.result.score} → ${after.score})` : 'Fix applied');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not apply the fix');
        } finally {
            setFixing(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-soft max-w-xl">
                    How well the post is written, apart from the strategy: the hook, specific detail, readability and rhythm.
                </p>
                <div className="flex gap-2">
                    {canUndo && (
                        <button onClick={() => { onApply(swap.before); setSwap(null); setCheck(null); }} className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                            <RotateCcw size={12} /> Undo fix
                        </button>
                    )}
                    <button
                        onClick={runCheck}
                        disabled={checking || !!fixing || tooShort}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        {checking ? <Spinner size={12} /> : check ? <RefreshCw size={12} /> : <Gauge size={12} />}
                        {check ? 'Re-check' : 'Check craft'}
                    </button>
                </div>
            </div>

            {score !== null && (
                <div className={`flex items-center justify-between rounded-tile px-5 py-3 shadow-raised ${scoreColor(score)}`}>
                    <span className="text-sm font-medium opacity-80">Craft score</span>
                    <span className="text-2xl font-medium tracking-[-0.03em]">{score}/100</span>
                </div>
            )}
            {stale && (
                <p className="text-xs text-ink-muted">The post changed since the hook and specifics were rated. Readability and rhythm are already up to date; re-check for the rest.</p>
            )}

            <ul className="grid gap-3 md:grid-cols-2">
                {criteria.map(c => (
                    <li key={c.key} className="flex flex-col gap-2 bg-canvas shadow-well rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-ink">{c.label}</span>
                            <span className="flex items-center gap-2 text-xs text-ink-muted">
                                <Dots value={c.rating} /> {c.points}/{c.max}
                            </span>
                        </div>
                        {c.note && <p className="text-xs text-ink-soft leading-snug">{c.note}</p>}
                        {c.rating < CRAFT_DONE_RATING && c.fix && (
                            <button
                                onClick={() => fix(c)}
                                disabled={disabled || !!fixing || checking}
                                title={c.fix}
                                className="self-start flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                            >
                                {fixing === c.key ? <Spinner size={12} /> : <Sparkles size={12} />}
                                {fixing === c.key ? 'Fixing...' : `Fix ${c.label.toLowerCase()}`}
                            </button>
                        )}
                    </li>
                ))}
                {!check && (
                    <li className="flex items-center bg-canvas shadow-well rounded-2xl p-4 text-xs text-ink-muted md:col-span-2">
                        {tooShort ? 'Write a little more, then check the hook and specifics.' : 'Press "Check craft" to rate the hook and specifics too.'}
                    </li>
                )}
            </ul>
        </div>
    );
}
