"use strict";

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Trash2, Lightbulb, Copy, Check, MessageSquareQuote, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Artifact } from '@/types';
import { captureAuthor, captureIntent, captureKind } from '@/lib/brain/captures';
import { canReframe } from '@/lib/brain/reframe';
import { INTENT_LABELS, intentChipClass } from './intentChip';

const KIND_LABELS = { bookmark: 'Bookmark', snip: 'Snip', frame: 'Frame' } as const;

interface ArtifactCardProps {
    artifact: Artifact;
    onDelete: (id: string) => void;
    onFindIdeas: (artifact: Artifact) => void;
    onReframe: (artifact: Artifact) => void;
    // Picking several for Find ideas: the whole card is the tap target and its own buttons step aside
    selecting?: boolean;
    selected?: boolean;
}

// Past this, the text is clamped and "Show all" opens it in place
const LONG_TEXT = 320;

export function ArtifactCard({ artifact, onDelete, onFindIdeas, onReframe, selecting, selected }: ArtifactCardProps) {
    const kind = captureKind(artifact);
    const author = captureAuthor(artifact);
    const reframable = canReframe(artifact);
    const intent = captureIntent(artifact);
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const isLong = (artifact.ocr_text?.length || 0) > LONG_TEXT || (artifact.ocr_text?.split('\n').length || 0) > 8;

    const handleCopy = () => {
        const text = artifact.ocr_text || artifact.user_note || "";
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`bg-surface rounded-tile shadow-card transition-all duration-200 overflow-hidden flex flex-col mb-4 break-inside-avoid ${selected ? 'ring-2 ring-ember-400' : ''} ${selecting ? '' : 'hover:shadow-float hover:-translate-y-0.5'}`}>
            {/* Header */}
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    {/* Favicon fallback */}
                    <div className="w-8 h-8 rounded-full bg-canvas shadow-well shrink-0 flex items-center justify-center overflow-hidden">
                        {artifact.source_domain ? (
                            <Image
                                src={`https://www.google.com/s2/favicons?domain=${artifact.source_domain}&sz=32`}
                                alt=""
                                width={16}
                                height={16}
                                className="w-4 h-4"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                                unoptimized
                            />
                        ) : (
                            <div className="w-2 h-2 bg-ink-muted rounded-full" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-ink truncate block max-w-[140px]" title={artifact.source_title}>
                            {artifact.source_domain || "Unknown Source"}
                        </span>
                        <span className="text-xs text-ink-muted truncate">
                            {author && <>{author} · </>}{formatDistanceToNow(new Date(artifact.created_at || artifact.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                </div>
                {selecting ? (
                    <span
                        aria-hidden="true"
                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-all ${selected ? 'bg-ember-500 text-white shadow-ember' : 'bg-canvas shadow-well'}`}
                    >
                        {selected && <Check size={16} strokeWidth={3} />}
                    </span>
                ) : (
                    <button
                        onClick={() => onDelete(artifact.id)}
                        aria-label="Delete capture"
                        className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-ink-muted hover:text-rose-700 active:shadow-pressed transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            {/* Note (if exists) */}
            {artifact.user_note && (
                <div className="px-5 pt-3 pb-1">
                    <p className="text-[17px] font-medium tracking-[-0.01em] text-ink italic">&quot;{artifact.user_note}&quot;</p>
                </div>
            )}

            {/* Content Body */}
            <div className="flex-1 relative group">
                <div className="px-5 py-2 flex flex-col gap-2">
                    {artifact.imageUrl && (
                        <a
                            href={artifact.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block rounded-2xl overflow-hidden bg-surface-muted max-h-64 ${selecting ? 'pointer-events-none' : ''}`}
                            tabIndex={selecting ? -1 : undefined}
                            title="Open the full image"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- stored capture, any size */}
                            <img src={artifact.imageUrl} alt={`Capture from ${artifact.source_domain || 'a page'}`} loading="lazy" className="w-full h-auto object-cover object-top" />
                        </a>
                    )}
                    {artifact.ocr_text ? (
                        <div className="bg-surface-muted rounded-2xl flex flex-col">
                            <p className={`text-sm text-ink-soft leading-relaxed p-3 whitespace-pre-line ${expanded ? '' : artifact.imageUrl ? 'line-clamp-4' : 'line-clamp-[10]'}`}>
                                {artifact.ocr_text}
                            </p>
                            {isLong && !selecting && (
                                <button
                                    onClick={() => setExpanded(e => !e)}
                                    aria-expanded={expanded}
                                    className="self-start h-11 px-3 -mt-1 flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ember-600"
                                >
                                    {expanded ? 'Show less' : 'Show all'}
                                    <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm bg-surface-muted p-3 rounded-2xl flex flex-col gap-1">
                            <p className="text-ink-soft">{artifact.source_title || 'No text saved.'}</p>
                            {kind === 'bookmark' && <p className="text-xs text-ink-muted">The page is read when you find ideas.</p>}
                            {kind !== 'bookmark' && artifact.ai_metadata?.analysis_failed && (
                                <p className="text-xs text-ink-muted">The text in this image couldn&apos;t be read when it was saved. The image is kept.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: what it is, then what to do with it */}
            <div className="px-5 pb-5 pt-3 flex flex-col gap-3 mt-auto">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    {kind && (
                        <span className="inline-block h-7 leading-7 px-3 rounded-full text-xs font-medium bg-canvas shadow-well text-ink-soft">
                            {KIND_LABELS[kind]}
                        </span>
                    )}
                    {intent && (
                        <span className={`inline-block h-7 leading-7 px-3 rounded-full text-xs font-medium ${intentChipClass(intent)}`}>
                            {INTENT_LABELS[intent]}
                        </span>
                    )}
                    {!!artifact.usedIn && (
                        <span className="text-xs text-ink-muted whitespace-nowrap" title="Pipeline items built from this capture">
                            In {artifact.usedIn} {artifact.usedIn === 1 ? 'post' : 'posts'}
                        </span>
                    )}
                </div>

                {!selecting && <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="w-10 h-10 flex items-center justify-center text-ink-muted hover:text-ink rounded-full active:shadow-pressed transition-all"
                        title="Copy text"
                        aria-label="Copy text"
                    >
                        {copied ? <Check size={14} className="text-sage-700" /> : <Copy size={14} />}
                    </button>
                    {artifact.source_url && (
                        <a
                            href={artifact.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 flex items-center justify-center text-ink-muted hover:text-ember-600 rounded-full active:shadow-pressed transition-all"
                            title="Open source"
                            aria-label="Open source"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                    <div className="flex-1" />
                    <button
                        onClick={() => onFindIdeas(artifact)}
                        className={`flex items-center gap-1.5 h-10 px-3.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${reframable ? 'bg-canvas shadow-raised text-ink hover:text-ember-600 active:shadow-pressed' : 'bg-ink text-white hover:bg-ink/90'}`}
                    >
                        <Lightbulb size={12} />
                        Find ideas
                    </button>
                    {reframable && (
                        <button
                            onClick={() => onReframe(artifact)}
                            title="Write your own take on this, straight to a draft"
                            className="flex items-center gap-1.5 h-10 px-3.5 bg-ink text-white rounded-full text-xs font-medium hover:bg-ink/90 transition-colors whitespace-nowrap"
                        >
                            <MessageSquareQuote size={12} />
                            Reframe
                        </button>
                    )}
                </div>}
            </div>
        </div>
    );
}
