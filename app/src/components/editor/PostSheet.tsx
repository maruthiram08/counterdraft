"use client";

import { useEffect, useState } from 'react';
import { X, ExternalLink, Check, AlertCircle, Copy } from 'lucide-react';
import { AnimatedIcon } from '@/components/icons/AnimatedIcon';
import { SendIcon } from '@/components/icons/animated';
import { POST_PLATFORMS, postUrl, isManualRecord, postPlatformFor } from '@/lib/posts/posted';
import { ThreadPreview } from './ThreadPreview';
import { NewsletterPreview } from './NewsletterPreview';
import type { Draft } from '@/types';
import type { PostedDetails } from '@/hooks/useDrafts';
import { Spinner } from "@/components/shared/Loading";

type Result = { ok: true } | { ok: false; error: string };

interface PostSheetProps {
    isOpen: boolean;
    onClose: () => void;
    draft: Draft;
    content: string;
    // 'post': the draft is about to go out. 'details': it is already posted, add or fix where and when.
    mode: 'post' | 'details';
    onMarkPosted: (details: PostedDetails) => Promise<Result>;
    onLinkedInPosted: () => void;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toDateInput = (iso?: string) => {
    if (!iso) return today();
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return today();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * PostSheet - the one place a draft becomes a post.
 * Most people copy the text and post it themselves (or with another tool), so that path is first-class:
 * copy, then mark as posted with optional platform, date and link. LinkedIn posting is offered only when connected.
 */
export function PostSheet({ isOpen, onClose, draft, content, mode, onMarkPosted, onLinkedInPosted }: PostSheetProps) {
    const manual = draft.published_posts?.find(isManualRecord);
    // Threads and newsletters copy in parts, and never go to LinkedIn as they are
    const format = draft.platform === 'x_thread' || draft.platform === 'newsletter' ? draft.platform : null;
    const [platform, setPlatform] = useState<string | null>(null);
    const [date, setDate] = useState(today());
    const [link, setLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [linkedIn, setLinkedIn] = useState<'unknown' | 'connected' | 'off'>('unknown');
    const [publishing, setPublishing] = useState(false);
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

    // Start from what we already know each time the sheet opens
    useEffect(() => {
        if (!isOpen) return;
        setPlatform(manual?.platform && manual.platform !== 'other' ? manual.platform : postPlatformFor(draft.labels?.platform || draft.platform));
        setDate(toDateInput(manual?.published_at));
        setLink(manual ? postUrl(manual) || '' : '');
        setCopied(false);
        setError(null);
        setPublishedUrl(null);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isOpen || mode !== 'post' || format || linkedIn !== 'unknown') return;
        let cancelled = false;
        fetch('/api/linkedin/status')
            .then(r => r.ok ? r.json() : null)
            .then(s => { if (!cancelled) setLinkedIn(s?.connected && !s?.tokenExpired ? 'connected' : 'off'); })
            .catch(() => { if (!cancelled) setLinkedIn('off'); });
        return () => { cancelled = true; };
    }, [isOpen, mode, format, linkedIn]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
        } catch {
            setError("Couldn't copy. Select the text in the editor and copy it from there.");
        }
    };

    const handleMark = async () => {
        setSaving(true);
        setError(null);
        const result = await onMarkPosted({
            platform: platform || 'other',
            url: link.trim() || undefined,
            postedAt: date === today() ? new Date().toISOString() : new Date(`${date}T12:00:00`).toISOString(),
        });
        setSaving(false);
        if (result.ok) onClose();
        else setError(result.error);
    };

    const handleLinkedIn = async () => {
        setPublishing(true);
        setError(null);
        try {
            const res = await fetch('/api/linkedin/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftId: draft.id, content }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to post to LinkedIn');
            setPublishedUrl(data.url || '');
            onLinkedInPosted();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to post to LinkedIn');
        } finally {
            setPublishing(false);
        }
    };

    const tooLongForLinkedIn = content.length > 3000;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="post-sheet-title"
                className="relative w-full md:max-w-lg md:mx-4 bg-surface rounded-t-card md:rounded-card shadow-float max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom duration-200"
            >
                <div className="flex items-center justify-between px-4 pt-5 pb-3 md:px-6 md:pt-6">
                    <h2 id="post-sheet-title" className="text-xl md:text-2xl font-medium tracking-[-0.02em] text-ink">
                        {publishedUrl !== null ? 'Posted on LinkedIn' : mode === 'details' ? 'Where it went out' : 'Mark as posted'}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-11 h-11 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-2">
                    {publishedUrl !== null ? (
                        <div className="text-center py-6">
                            <div className="w-14 h-14 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={28} className="text-sage-700" />
                            </div>
                            <p className="text-ink-soft mb-6">It&apos;s live on LinkedIn and saved under Posted.</p>
                            {publishedUrl && (
                                <a
                                    href={publishedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                >
                                    <ExternalLink size={16} />
                                    View on LinkedIn
                                </a>
                            )}
                        </div>
                    ) : (
                        <>
                            {mode === 'post' && format && (
                                <>
                                    <p className="text-sm text-ink-soft mb-4">
                                        {format === 'x_thread'
                                            ? 'Copy each post into X as a reply to the one before, then mark it here so it moves to Posted.'
                                            : 'Copy it into your newsletter tool, then mark it here so it moves to Posted.'}
                                    </p>
                                    <div className="mb-5">
                                        {format === 'x_thread'
                                            ? <ThreadPreview content={content} numbered={draft.platform_metadata?.numbered !== false} />
                                            : <NewsletterPreview content={content} title={draft.belief_text} compact />}
                                    </div>
                                </>
                            )}
                            {mode === 'post' && !format && (
                                <>
                                    <p className="text-sm text-ink-soft mb-4">
                                        Post it wherever you like, then mark it here so it moves to Posted and CounterDraft learns from your final version.
                                    </p>
                                    <button
                                        onClick={handleCopy}
                                        className="w-full h-12 mb-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all flex items-center justify-center gap-2"
                                    >
                                        {copied ? <Check size={16} className="text-sage-700" /> : <Copy size={16} />}
                                        {copied ? 'Copied. Go post it.' : 'Copy the text'}
                                    </button>
                                </>
                            )}

                            <fieldset className="mb-5">
                                <legend className="text-sm font-medium text-ink mb-2">Where did it go? <span className="text-ink-muted font-normal">Optional</span></legend>
                                <div className="flex flex-wrap gap-2">
                                    {POST_PLATFORMS.map(p => (
                                        <button
                                            key={p.key}
                                            type="button"
                                            aria-pressed={platform === p.key}
                                            onClick={() => setPlatform(platform === p.key ? null : p.key)}
                                            className={`h-10 px-4 rounded-full text-sm font-medium transition-all ${platform === p.key
                                                ? 'bg-ember-100 text-ember-700 shadow-pressed'
                                                : 'bg-canvas text-ink-soft shadow-raised hover:text-ink'}`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 mb-4">
                                <label className="block">
                                    <span className="block text-sm font-medium text-ink mb-2">When</span>
                                    <input
                                        type="date"
                                        value={date}
                                        max={today()}
                                        onChange={e => setDate(e.target.value || today())}
                                        className="h-11 w-full px-4 rounded-full bg-canvas shadow-well text-base md:text-sm text-ink focus:outline-none"
                                    />
                                </label>
                                <label className="block min-w-0">
                                    <span className="block text-sm font-medium text-ink mb-2">Link to the post <span className="text-ink-muted font-normal">Optional</span></span>
                                    <input
                                        type="url"
                                        inputMode="url"
                                        autoComplete="off"
                                        placeholder="https://"
                                        value={link}
                                        onChange={e => setLink(e.target.value)}
                                        className="h-11 w-full px-4 rounded-full bg-canvas shadow-well text-base md:text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none"
                                    />
                                </label>
                            </div>

                            {mode === 'post' && !format && linkedIn === 'connected' && (
                                <div className="mt-2 mb-2 pt-4 border-t border-line">
                                    <p className="text-sm text-ink-soft mb-3">Or let CounterDraft post it to your LinkedIn now.</p>
                                    <button
                                        onClick={handleLinkedIn}
                                        disabled={publishing || tooLongForLinkedIn}
                                        className="w-full h-11 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {publishing ? <Spinner size={16} /> : <AnimatedIcon icon={SendIcon} size={15} />}
                                        {publishing ? 'Posting…' : 'Post to LinkedIn'}
                                    </button>
                                    {tooLongForLinkedIn && (
                                        <p className="text-xs text-ink-muted mt-2">LinkedIn allows 3,000 characters; this is {content.length.toLocaleString()}.</p>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="mt-3 p-3 bg-rose-100 rounded-tile flex items-start gap-2 text-rose-700">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="px-4 pt-3 pb-4 md:px-6 md:pb-6 safe-area-pb flex gap-3">
                    {publishedUrl !== null ? (
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none md:ml-auto h-12 md:h-11 px-6 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised active:shadow-pressed transition-all"
                        >
                            Done
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="hidden md:block md:ml-auto h-11 px-4 rounded-full text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMark}
                                disabled={saving || publishing}
                                className="flex-1 md:flex-none h-12 md:h-11 px-6 rounded-full bg-ember-500 hover:bg-ember-600 text-white text-sm font-medium shadow-ember active:shadow-pressed transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {saving && <Spinner size={16} />}
                                {mode === 'details' ? 'Save' : 'Mark as posted'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
