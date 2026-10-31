"use client";

import { useEffect, useState } from "react";
import { X, PenTool } from "lucide-react";
import { toast } from "sonner";
import type { Artifact, ReframeMode } from "@/types";
import { captureAuthor, captureDomain } from "@/lib/brain/captures";
import { REFRAME_FORMATS, REFRAME_MODES, buildReframeItem, startingMode, whosePost } from "@/lib/brain/reframe";
import { Spinner } from "@/components/shared/Loading";

interface ReframeSheetProps {
    capture: Artifact;
    onClose: () => void;
    // Opens the new post in the writing wizard, on the Draft step
    onOpenItem?: (itemId: string) => void;
    // A capture was used, so its "In N posts" count changes
    onSaved?: () => void;
}

// One quick choice, then straight to a draft: how you want to respond to a post you saved
export function ReframeSheet({ capture, onClose, onOpenItem, onSaved }: ReframeSheetProps) {
    const [mode, setMode] = useState<ReframeMode>(() => startingMode(capture));
    const [take, setTake] = useState('');
    const [formatId, setFormatId] = useState('auto');
    const [busy, setBusy] = useState(false);

    const author = captureAuthor(capture);
    const domain = captureDomain(capture);
    // Borrowing a style needs a topic of your own
    const needsTake = mode === 'style' && take.trim().length < 10;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const start = async () => {
        if (busy || needsTake) return;
        setBusy(true);
        try {
            const item = buildReframeItem(capture, { mode, take, formatId });
            const res = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, stage: 'developing' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(res.status === 403
                    ? (data.message || "You've used this month's drafts.")
                    : "Couldn't start the post. Try again.");
            }
            onSaved?.();
            const itemId: string | undefined = data.item?.id;
            if (itemId && onOpenItem) onOpenItem(itemId);
            else toast.success('Saved to Pipeline');
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't start the post. Try again.");
            setBusy(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-40" onClick={onClose} />

            {/* A bottom sheet on phones, a centred dialog from md up */}
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reframe-title"
                    className="pointer-events-auto bg-canvas w-full md:max-w-xl max-h-[90dvh] md:max-h-[85vh] rounded-t-card md:rounded-card shadow-float flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
                >
                    <div className="flex items-start justify-between gap-3 px-5 md:px-6 pt-5 md:pt-6 pb-3">
                        <div className="min-w-0">
                            <h2 id="reframe-title" className="text-xl md:text-2xl font-medium tracking-[-0.02em] text-ink">Reframe</h2>
                            <p className="text-sm text-ink-soft truncate">Your take on {whosePost(author, domain)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 md:px-6 py-3 flex flex-col gap-5">
                        <p className="shrink-0 text-sm text-ink-soft leading-relaxed bg-surface-muted p-3 rounded-2xl whitespace-pre-line line-clamp-4">
                            {capture.ocr_text}
                        </p>

                        <fieldset className="flex flex-col gap-2">
                            <legend className="text-sm font-medium text-ink mb-2">How do you want to respond?</legend>
                            {REFRAME_MODES.map(m => {
                                const active = m.id === mode;
                                return (
                                    <label
                                        key={m.id}
                                        className={`min-h-11 px-4 py-2.5 rounded-tile flex items-center gap-3 cursor-pointer transition-all ${active ? 'bg-surface shadow-pressed' : 'bg-canvas shadow-raised hover:text-ember-600'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="reframe-mode"
                                            value={m.id}
                                            checked={active}
                                            onChange={() => setMode(m.id)}
                                            className="w-4 h-4 accent-ember-500 shrink-0"
                                        />
                                        <span className="flex flex-col min-w-0">
                                            <span className={`text-sm font-medium ${active ? 'text-ember-600' : 'text-ink'}`}>{m.label}</span>
                                            <span className="text-xs text-ink-muted">{m.hint}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </fieldset>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="reframe-take" className="text-sm font-medium text-ink">
                                {mode === 'style' ? 'What is your post about?' : 'Your take'} <span className="text-ink-muted font-normal">{mode === 'style' ? '(needed)' : '(optional)'}</span>
                            </label>
                            <input
                                id="reframe-take"
                                value={take}
                                onChange={e => setTake(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') start(); }}
                                maxLength={300}
                                placeholder={mode === 'style' ? 'The topic you want to write about in this style' : 'One line on what you want to say'}
                                className="h-11 px-4 bg-canvas shadow-well rounded-full text-base md:text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-ink">Format</span>
                            <div className="flex flex-wrap gap-2">
                                {REFRAME_FORMATS.map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setFormatId(f.id)}
                                        aria-pressed={f.id === formatId}
                                        className={`h-11 px-4 rounded-full text-sm font-medium transition-all ${f.id === formatId ? 'bg-canvas shadow-pressed text-ember-600' : 'bg-canvas shadow-raised text-ink-soft hover:text-ember-600'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-between gap-2 px-5 md:px-6 pt-3 pb-5">
                        <p className="hidden sm:block text-xs text-ink-muted">Skips research and outline. Your voice and past posts still apply.</p>
                        <button
                            onClick={start}
                            disabled={busy || needsTake}
                            className="h-11 px-5 shrink-0 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {busy ? <Spinner size={16} /> : <PenTool size={14} />}
                            Write my take
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
