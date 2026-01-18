"use client";

import { Compass, Pen } from "lucide-react";

interface DirectionCardProps {
    title: string;
    reason: string;
    relatedBelief?: string;
    onDraft?: (topic: string) => void;
}

export function DirectionCard({ title, reason, relatedBelief, onDraft }: DirectionCardProps) {
    return (
        <div className="card hover:border-[var(--accent)] transition-colors group flex flex-col h-full">
            <div className="flex items-start gap-3 mb-4 flex-1">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors shrink-0">
                    <Compass size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold leading-tight mb-2 group-hover:text-[var(--accent)] transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        {reason}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border)]">
                {relatedBelief && (
                    <div
                        className="flex flex-col mr-4 min-w-0 flex-1"
                        title={relatedBelief}
                    >
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-0.5">Based on belief</span>
                        <span className="text-xs text-[var(--text-subtle)] font-medium line-clamp-2 break-words leading-tight">
                            "{relatedBelief}"
                        </span>
                    </div>
                )}

                {onDraft && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDraft(title);
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors ml-auto"
                    >
                        <Pen size={14} /> Draft Post
                    </button>
                )}
            </div>
        </div>
    );
}

