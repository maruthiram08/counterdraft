"use strict";

import { useMemo } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Trash2, PenTool, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Artifact } from '@/types';

interface ArtifactCardProps {
    artifact: Artifact;
    onDelete: (id: string) => void;
    onCreateDraft: (artifact: Artifact) => void;
}

export function ArtifactCard({ artifact, onDelete, onCreateDraft }: ArtifactCardProps) {
    const [copied, setCopied] = useState(false);

    const intentColor = useMemo(() => {
        switch (artifact.intent_type) {
            case 'agree': return 'bg-green-100 text-green-800 border-green-200';
            case 'counter': return 'bg-red-100 text-red-800 border-red-200';
            case 'evidence': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'framing': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }, [artifact.intent_type]);

    const handleCopy = () => {
        const text = artifact.ocr_text || artifact.user_note || "";
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col mb-4 break-inside-avoid">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2 overflow-hidden">
                    {/* Favicon fallback */}
                    <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 flex items-center justify-center overflow-hidden">
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
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-900 truncate block max-w-[140px]" title={artifact.source_title}>
                            {artifact.source_domain || "Unknown Source"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {formatDistanceToNow(new Date(artifact.created_at || artifact.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(artifact.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Note (if exists) */}
            {artifact.user_note && (
                <div className="px-4 pt-4 pb-2">
                    <p className="text-sm font-medium text-gray-800 italic">&quot;{artifact.user_note}&quot;</p>
                </div>
            )}

            {/* Content Body */}
            <div className="flex-1 relative group">
                {artifact.image_path ? (
                    // If we had image storage, we'd show it here.
                    // Since we are text-only for now (or base64 if we decided to store it, but route.ts currently skips storage),
                    // We check if we have ocr_text to display instead.
                    <div className="bg-gray-100 h-32 flex items-center justify-center text-gray-400 text-xs">
                        Image (Not Stored)
                    </div>
                ) : (
                    <div className="px-4 py-2">
                        {artifact.ocr_text ? (
                            <p className="text-sm text-gray-600 line-clamp-[10] font-serif leading-relaxed bg-amber-50/30 p-2 rounded border border-amber-100/50">
                                {artifact.ocr_text}
                            </p>
                        ) : (
                            !artifact.user_note && <div className="h-12 flex items-center justify-center text-gray-300 text-xs">No Content</div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-gray-100 flex items-center justify-between mt-auto bg-white">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${intentColor}`}>
                    {artifact.intent_type || 'saved'}
                </span>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-gray-400 hover:text-gray-900 rounded-md transition-colors"
                        title="Copy text"
                    >
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                    {artifact.source_url && (
                        <a
                            href={artifact.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                            title="Open Source"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                    <button
                        onClick={() => onCreateDraft(artifact)}
                        className="flex items-center gap-1.5 pl-2 pr-3 py-1 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors ml-1"
                    >
                        <PenTool size={10} />
                        Draft
                    </button>
                </div>
            </div>
        </div>
    );
}
