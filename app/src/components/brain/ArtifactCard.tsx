"use strict";

import { useMemo } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Trash2, Lightbulb, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Artifact } from '@/types';
import { captureKind } from '@/lib/brain/captures';

const KIND_LABELS = { bookmark: 'Bookmark', snip: 'Snip', frame: 'Frame' } as const;

interface ArtifactCardProps {
    artifact: Artifact;
    onDelete: (id: string) => void;
    onFindIdeas: (artifact: Artifact) => void;
}

export function ArtifactCard({ artifact, onDelete, onFindIdeas }: ArtifactCardProps) {
    const kind = captureKind(artifact);
    const [copied, setCopied] = useState(false);

    const intentColor = useMemo(() => {
        switch (artifact.intent_type) {
            case 'agree': return 'bg-sage-100 text-sage-700';
            case 'counter': return 'bg-rose-100 text-rose-700';
            case 'evidence': return 'bg-dusk-100 text-dusk-700';
            case 'framing': return 'bg-ember-100 text-ember-700';
            default: return 'bg-canvas shadow-well text-ink-soft';
        }
    }, [artifact.intent_type]);

    const handleCopy = () => {
        const text = artifact.ocr_text || artifact.user_note || "";
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-surface rounded-tile shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col mb-4 break-inside-avoid">
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
                        <span className="text-xs text-ink-muted">
                            {formatDistanceToNow(new Date(artifact.created_at || artifact.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(artifact.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:text-rose-700 active:shadow-pressed transition-all"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Note (if exists) */}
            {artifact.user_note && (
                <div className="px-5 pt-3 pb-1">
                    <p className="text-[17px] font-medium tracking-[-0.01em] text-ink italic">&quot;{artifact.user_note}&quot;</p>
                </div>
            )}

            {/* Content Body */}
            <div className="flex-1 relative group">
                <div className="px-5 py-2">
                    {artifact.ocr_text ? (
                        <p className="text-sm text-ink-soft line-clamp-[10] leading-relaxed bg-surface-muted p-3 rounded-2xl whitespace-pre-line">
                            {artifact.ocr_text}
                        </p>
                    ) : (
                        <div className="text-sm bg-surface-muted p-3 rounded-2xl flex flex-col gap-1">
                            <p className="text-ink-soft">{artifact.source_title || 'No text saved.'}</p>
                            {kind === 'bookmark' && <p className="text-xs text-ink-muted">The page is read when you find ideas.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-2 mt-auto">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    {kind && (
                        <span className="inline-block h-7 leading-7 px-3 rounded-full text-xs font-medium bg-canvas shadow-well text-ink-soft">
                            {KIND_LABELS[kind]}
                        </span>
                    )}
                    {artifact.intent_type && (
                        <span className={`inline-block h-7 leading-7 px-3 rounded-full text-xs font-medium lowercase first-letter:uppercase ${intentColor}`}>
                            {artifact.intent_type}
                        </span>
                    )}
                    {!!artifact.usedIn && (
                        <span className="text-xs text-ink-muted whitespace-nowrap" title="Pipeline items built from this capture">
                            In {artifact.usedIn} {artifact.usedIn === 1 ? 'post' : 'posts'}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink rounded-full active:shadow-pressed transition-all"
                        title="Copy text"
                    >
                        {copied ? <Check size={14} className="text-sage-700" /> : <Copy size={14} />}
                    </button>
                    {artifact.source_url && (
                        <a
                            href={artifact.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ember-600 rounded-full active:shadow-pressed transition-all"
                            title="Open Source"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                    <button
                        onClick={() => onFindIdeas(artifact)}
                        className="flex items-center gap-1.5 h-9 pl-3 pr-3.5 bg-ink text-white rounded-full text-xs font-medium hover:bg-ink/90 transition-colors ml-1 whitespace-nowrap"
                    >
                        <Lightbulb size={12} />
                        Find ideas
                    </button>
                </div>
            </div>
        </div>
    );
}
