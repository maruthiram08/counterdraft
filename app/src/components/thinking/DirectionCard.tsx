"use client";

import { Pen } from "lucide-react";

interface DirectionCardProps {
    title: string;
    reason: string;
    relatedBelief?: string;
    onDraft?: (topic: string) => void;
}

export function DirectionCard({ title, reason, relatedBelief, onDraft }: DirectionCardProps) {
    return (
        <div className="group bg-surface rounded-tile shadow-card p-5 hover:shadow-float hover:-translate-y-0.5 transition-all">
            <div className="flex justify-between items-start gap-8">

                {/* Content */}
                <div className="max-w-2xl">
                    <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink mb-2 group-hover:text-ember-600 transition-colors cursor-pointer" onClick={() => onDraft && onDraft(title)}>
                        {title}
                    </h3>
                    <p className="text-sm text-ink-soft leading-relaxed mb-3">
                        {reason}
                    </p>

                    {relatedBelief && (
                        <div className="flex items-center gap-2 text-xs text-ink-muted">
                            <span className="w-1 h-1 rounded-full bg-ember-500" />
                            <span className="italic truncate max-w-md">
                                from &quot;{relatedBelief}&quot;
                            </span>
                        </div>
                    )}
                </div>

                {/* Action */}
                {onDraft && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDraft(title);
                        }}
                        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ember-600 active:shadow-pressed transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        title="Start Draft"
                    >
                        <Pen size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
