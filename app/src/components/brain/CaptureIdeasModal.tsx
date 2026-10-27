"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Loader2, Lightbulb, Check, PenTool, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Artifact, ExploreOrigin } from "@/types";
import { captureKind } from "@/lib/brain/captures";

interface CaptureIdea {
    hook: string;
    angle: string;
    format: string;
    belief?: string;
}

type CaptureSource = ExploreOrigin['sources'][number];

interface CaptureIdeasModalProps {
    captures: Artifact[];
    onClose: () => void;
    // Opens a saved idea in the writing wizard
    onOpenItem?: (itemId: string) => void;
    // A capture changed: used in a post (its "In N posts" count), or a bookmark's page text was saved
    onSaved?: () => void;
}

const KIND_NAMES = { bookmark: 'bookmark', snip: 'snip', frame: 'frame', capture: 'capture' } as const;

const sentenceCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Post ideas from one capture or several, the same way Explore turns stories into ideas.
// A saved idea carries the captures (text, intent, note) into research, outline and draft.
export function CaptureIdeasModal({ captures, onClose, onOpenItem, onSaved }: CaptureIdeasModalProps) {
    const [ideas, setIdeas] = useState<CaptureIdea[]>([]);
    const [sources, setSources] = useState<CaptureSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Bookmarks whose page couldn't be read
    const [unread, setUnread] = useState<string[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [ownHook, setOwnHook] = useState('');

    const ids = captures.map(c => c.id).join(',');

    const findIdeas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/explore/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captureIds: ids.split(','), count: 3 }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(res.status === 403
                    ? (data.message || "You've used this month's idea searches.")
                    : (data.error || "Couldn't find ideas. Try again."));
            }
            setIdeas(data.ideas || []);
            setSources(data.captureSources || []);
            setUnread(data.unreadCaptures || []);
            // A bookmark read just now keeps its text, so its card can show it
            if (captures.some(c => !c.ocr_text?.trim())) onSaved?.();
            if (!data.ideas?.length) setError("No strong ideas came out of this. Try again, or write your own below.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't find ideas. Try again.");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runs again only when the captures change
    }, [ids]);

    useEffect(() => { findIdeas(); }, [findIdeas]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const save = async (idea: CaptureIdea, open: boolean) => {
        setBusy(idea.hook);
        try {
            const explore: ExploreOrigin = {
                query: '',
                label: captures.length === 1 ? 'Your capture' : `${captures.length} captures`,
                from: 'captures',
                sources,
                idea: { hook: idea.hook, angle: idea.angle, format: idea.format, ...(idea.belief ? { belief: idea.belief } : {}) },
                savedAs: 'idea',
            };
            const res = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: idea.hook,
                    angle: idea.angle || undefined,
                    format: idea.format || undefined,
                    stage: 'idea',
                    brain_metadata: { explore },
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            const data = await res.json();
            const itemId: string | undefined = data.item?.id;
            setSaved(prev => new Set([...prev, idea.hook]));
            onSaved?.();
            if (open && itemId && onOpenItem) {
                onOpenItem(itemId);
                onClose();
            } else {
                toast.success('Idea saved to Pipeline', {
                    action: itemId && onOpenItem ? { label: 'Start writing', onClick: () => onOpenItem(itemId) } : undefined,
                });
            }
        } catch {
            toast.error("Couldn't save the idea. Try again.");
        } finally {
            setBusy(null);
        }
    };

    const saveOwn = () => {
        const hook = ownHook.trim();
        if (hook.length < 10) {
            toast.error('Write a little more: at least 10 characters.');
            return;
        }
        save({ hook, angle: '', format: '' }, true);
    };

    return (
        <>
            <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-40" onClick={onClose} />

            {/* A bottom sheet on phones, a centred dialog from md up */}
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="capture-ideas-title"
                    className="pointer-events-auto bg-canvas w-full md:max-w-2xl max-h-[90dvh] md:max-h-[85vh] rounded-t-card md:rounded-card shadow-float flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
                >
                    <div className="flex items-start justify-between gap-3 px-5 md:px-6 pt-5 md:pt-6 pb-3">
                        <div className="min-w-0">
                            <h2 id="capture-ideas-title" className="text-xl md:text-2xl font-medium tracking-[-0.02em] text-ink">Post ideas</h2>
                            <p className="text-sm text-ink-soft truncate">
                                {captures.length === 1
                                    ? `From your ${KIND_NAMES[captureKind(captures[0]) || 'capture']}${captures[0].source_domain ? ` on ${captures[0].source_domain.replace(/^www\./, '')}` : ''}`
                                    : `From ${captures.length} captures`}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 md:px-6 py-3 flex flex-col gap-3">
                        {loading ? (
                            <div className="py-14 flex flex-col items-center gap-3 text-ink-soft text-sm">
                                <Loader2 className="animate-spin text-ember-500" />
                                Reading your {captures.length === 1 ? 'capture' : 'captures'}…
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="bg-rose-100 rounded-tile p-4 text-rose-700 text-sm">{error}</div>
                                )}
                                {unread.length > 0 && (
                                    <div role="status" className="bg-ember-50 rounded-tile p-4 text-ink-soft text-sm">
                                        Couldn&apos;t read {unread.length === 1 ? <b className="text-ink">{unread[0]}</b> : `${unread.length} of the pages`}, so these ideas use {unread.length === 1 ? 'its' : 'their'} title and your note only. Sites that need a login (LinkedIn, X, paywalls) can only be read by Lens: open the page and save it again, or Frame the part you want.
                                    </div>
                                )}
                                {ideas.map(idea => {
                                    const isSaved = saved.has(idea.hook);
                                    const isBusy = busy === idea.hook;
                                    return (
                                        <div key={idea.hook} className="bg-surface rounded-tile shadow-card p-4 flex flex-col gap-2">
                                            {idea.format && (
                                                <span className="self-start h-7 px-3 rounded-full bg-canvas shadow-well text-ink-soft text-xs font-medium flex items-center">
                                                    {sentenceCase(idea.format)}
                                                </span>
                                            )}
                                            <p className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-snug">{idea.hook}</p>
                                            {idea.angle && <p className="text-sm text-ink-soft leading-relaxed">{idea.angle}</p>}
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                <button
                                                    onClick={() => save(idea, true)}
                                                    disabled={!!busy || isSaved}
                                                    className="h-11 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isBusy ? <Loader2 size={16} className="animate-spin" /> : <PenTool size={14} />}
                                                    Start writing
                                                </button>
                                                <button
                                                    onClick={() => save(idea, false)}
                                                    disabled={!!busy || isSaved}
                                                    className="h-11 px-4 rounded-full bg-canvas shadow-raised text-ink text-sm font-medium hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-60 flex items-center gap-2"
                                                >
                                                    {isSaved ? <Check size={16} className="text-sage-700" /> : <Lightbulb size={14} />}
                                                    {isSaved ? 'Saved' : 'Save to Pipeline'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {!loading && (
                            <div className="flex flex-col gap-2 pt-2">
                                <label htmlFor="capture-own-idea" className="text-sm font-medium text-ink">Or write your own idea</label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        id="capture-own-idea"
                                        value={ownHook}
                                        onChange={e => setOwnHook(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveOwn(); }}
                                        placeholder="What do you want to say about this?"
                                        className="flex-1 min-w-0 h-11 px-4 bg-canvas shadow-well rounded-full text-base md:text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                    />
                                    <button
                                        onClick={saveOwn}
                                        disabled={!!busy || !ownHook.trim()}
                                        className="h-11 px-4 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                                    >
                                        Start writing
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end sm:justify-between gap-2 px-5 md:px-6 pt-3 pb-5">
                        <p className="hidden sm:block text-xs text-ink-muted">Each idea keeps your captures, notes and intent for research and drafting.</p>
                        <button
                            onClick={findIdeas}
                            disabled={loading || !!busy}
                            className="h-11 px-4 shrink-0 rounded-full bg-canvas shadow-raised text-sm font-medium text-ink hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw size={14} />
                            New ideas
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
