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
        <div className="group py-6 px-4 border-b border-gray-100 bg-white hover:bg-gray-50/30 transition-all">
            <div className="flex justify-between items-start gap-8">

                {/* Content */}
                <div className="max-w-2xl">
                    <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-[var(--accent)] transition-colors cursor-pointer" onClick={() => onDraft && onDraft(title)}>
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-3">
                        {reason}
                    </p>

                    {relatedBelief && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="font-serif italic truncate max-w-md opacity-70">
                                from "{relatedBelief}"
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
                        className="shrink-0 p-2 rounded-full text-gray-300 hover:text-[var(--accent)] hover:bg-white hover:shadow-sm transition-all opacity-0 group-hover:opacity-100"
                        title="Start Draft"
                    >
                        <Pen size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
