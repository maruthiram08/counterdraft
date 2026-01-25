"use client";

import { useState } from "react";
import { Check, X, MessageSquare, Pen, Loader2 } from "lucide-react";

interface BeliefCardProps {
    belief: string;
    sourceCount: number;
    type: 'core' | 'emerging' | 'overused';
    beliefId?: string;
    onFeedback?: (beliefId: string, feedback: 'accurate' | 'misses' | 'clarify') => void;
    onWriteAbout?: (belief: { id: string; text: string; type: string }) => Promise<void>;
    // Confidence model
    confidenceLevel?: 'low' | 'medium' | 'high';
    isStable?: boolean;
    evidenceCount?: number;
    context?: string | null;
}

const CONFIDENCE_COLORS = {
    low: 'text-amber-500',
    medium: 'text-gray-400',
    high: 'text-green-500',
};

export function BeliefCard({ belief, sourceCount, type, beliefId, onFeedback, onWriteAbout, confidenceLevel = 'medium', isStable = false, evidenceCount = 1, context }: BeliefCardProps) {
    const [expanded, setExpanded] = useState(true);
    const [status, setStatus] = useState<'pending' | 'accurate' | 'misses' | 'clarify'>('pending');
    const [dismissed, setDismissed] = useState(false);
    const [writingAbout, setWritingAbout] = useState(false);
    const [addedToPipeline, setAddedToPipeline] = useState(false);

    const handleFeedback = (newStatus: 'accurate' | 'misses' | 'clarify') => {
        setStatus(newStatus);
        if (onFeedback && beliefId) {
            onFeedback(beliefId, newStatus);
        }
        setTimeout(() => setDismissed(true), 1200);
    };

    const handleWriteAbout = async () => {
        if (!onWriteAbout || !beliefId) return;
        setWritingAbout(true);
        try {
            await onWriteAbout({ id: beliefId, text: belief, type });
            setAddedToPipeline(true);
        } catch (err) {
            console.error('Failed to create idea from belief:', err);
        } finally {
            setWritingAbout(false);
        }
    };

    if (dismissed) return null;

    return (
        <div className="group relative bg-white border-b border-gray-100 py-6 md:py-8 px-4 hover:bg-gray-50/50 transition-colors">

            {/* Meta Top Line */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-medium text-gray-400">
                    {type} Belief
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-200" />
                {/* Confidence Indicator */}
                <span className={`text-[10px] uppercase tracking-widest font-medium ${CONFIDENCE_COLORS[confidenceLevel]}`}>
                    {confidenceLevel} confidence
                </span>
                {isStable && (
                    <>
                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                        <span className="text-[10px] uppercase tracking-widest font-medium text-blue-500">
                            Stable
                        </span>
                    </>
                )}
                <span className="w-1 h-1 rounded-full bg-gray-200" />
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] uppercase tracking-widest font-medium text-gray-400 hover:text-[var(--accent)] transition-colors flex items-center gap-1"
                >
                    {evidenceCount} {evidenceCount === 1 ? 'Evidence' : 'Evidence'}
                </button>
                {addedToPipeline && (
                    <>
                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                        <span className="text-[10px] uppercase tracking-widest font-medium text-green-600">
                            Added to Pipeline
                        </span>
                    </>
                )}
            </div>

            {/* Content */}
            {/* Content */}
            {/* Content */}
            {/* Content */}
            <div className="w-full h-auto">
                <p className="w-full h-auto text-lg md:text-2xl font-serif text-gray-900 leading-normal break-words whitespace-pre-wrap">
                    {belief}
                </p>
            </div>

            {/* Minimal Actions - Always visible on mobile, hover on desktop */}
            <div className="mt-4 md:mt-6 flex flex-wrap items-center gap-4 md:gap-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
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
                        <div className="w-px h-3 bg-gray-200 mx-2" />
                        {onWriteAbout && !addedToPipeline && (
                            <button
                                onClick={handleWriteAbout}
                                disabled={writingAbout}
                                className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-dark)] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {writingAbout ? (
                                    <><Loader2 size={14} className="animate-spin" /> Adding...</>
                                ) : (
                                    <><Pen size={14} /> Write about this</>
                                )}
                            </button>
                        )}
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
                        {context && context.length > 5 ? context : "No specific context available yet."}
                    </p>
                </div>
            )}
        </div>
    );
}
