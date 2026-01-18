"use client";

import { useState } from "react";
import { Check, X, MessageSquare, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

interface BeliefCardProps {
    belief: string;
    sourceCount: number;
    type: 'core' | 'emerging' | 'overused';
    beliefId?: string;
    onFeedback?: (beliefId: string, feedback: 'accurate' | 'misses' | 'clarify') => void;
}

export function BeliefCard({ belief, sourceCount, type, beliefId, onFeedback }: BeliefCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<'pending' | 'accurate' | 'misses' | 'clarify'>('pending');
    const [dismissed, setDismissed] = useState(false);

    const handleFeedback = (newStatus: 'accurate' | 'misses' | 'clarify') => {
        setStatus(newStatus);
        if (onFeedback && beliefId) {
            onFeedback(beliefId, newStatus);
        }
        setTimeout(() => setDismissed(true), 1200);
    };

    if (dismissed) return null;

    return (
        <div className="group relative bg-white border-b border-gray-100 py-8 px-4 hover:bg-gray-50/50 transition-colors">

            {/* Meta Top Line */}
            <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] uppercase tracking-widest font-medium text-gray-400">
                    {type} Belief
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-200" />
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] uppercase tracking-widest font-medium text-gray-400 hover:text-[var(--accent)] transition-colors flex items-center gap-1"
                >
                    {sourceCount} {sourceCount === 1 ? 'Source' : 'Sources'}
                </button>
            </div>

            {/* Content */}
            <div className="max-w-3xl">
                <p className="text-2xl font-serif text-gray-900 leading-relaxed">
                    {belief}
                </p>
            </div>

            {/* Minimal Actions - Reveal on Hover */}
            <div className="mt-6 flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {status === 'pending' ? (
                    <>
                        <button
                            onClick={() => handleFeedback('accurate')}
                            className="text-xs font-medium text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                        >
                            <Check size={14} /> Accurate
                        </button>
                        <button
                            onClick={() => handleFeedback('misses')}
                            className="text-xs font-medium text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                        >
                            <X size={14} /> Misses
                        </button>
                        <button
                            onClick={() => handleFeedback('clarify')}
                            className="text-xs font-medium text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                        >
                            <MessageSquare size={14} /> Clarify
                        </button>
                    </>
                ) : (
                    <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                        <Check size={14} className="text-[var(--accent)]" /> Feedback saved
                    </span>
                )}
            </div>

            {/* Source Expansion */}
            {expanded && (
                <div className="mt-6 pl-4 border-l-2 border-gray-100">
                    <p className="text-sm text-gray-500 italic font-serif">
                        Context snippets would appear here...
                    </p>
                </div>
            )}
        </div>
    );
}
