"use client";

import { useState } from "react";
import { Check, X, MessageSquare, Pen } from "lucide-react";
import { Spinner } from "@/components/shared/Loading";

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
    low: 'bg-canvas shadow-well text-ink-soft',
    medium: 'bg-ember-100 text-ember-700',
    high: 'bg-ink text-white',
};

const CHIP_BASE = 'inline-block h-7 leading-7 px-3 rounded-full text-xs font-medium lowercase first-letter:uppercase';
const CHIP = `${CHIP_BASE} bg-canvas shadow-well text-ink-soft`;
const ACTION = 'h-10 md:h-9 px-3 rounded-full text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-muted active:shadow-pressed flex items-center gap-1.5 transition-all';

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
        <div className="group relative bg-surface rounded-tile shadow-card p-5 md:p-6 hover:shadow-float hover:-translate-y-0.5 transition-all">

            {/* Meta Top Line */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={CHIP}>
                    {type} Belief
                </span>
                {/* Confidence Indicator */}
                <span className={`${CHIP_BASE} ${CONFIDENCE_COLORS[confidenceLevel]}`}>
                    {confidenceLevel} confidence
                </span>
                {isStable && (
                    <>
                        <span className={`${CHIP_BASE} bg-dusk-100 text-dusk-700`}>
                            Stable
                        </span>
                    </>
                )}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`${CHIP} hover:text-ember-600 active:shadow-pressed transition-colors`}
                >
                    {evidenceCount} {evidenceCount === 1 ? 'Evidence' : 'Evidence'}
                </button>
                {sourceCount > 0 && (
                    <>
                        <span className={CHIP}>
                            {sourceCount} Source{sourceCount === 1 ? '' : 's'}
                        </span>
                    </>
                )}
                {addedToPipeline && (
                    <>
                        <span className={`${CHIP_BASE} bg-sage-100 text-sage-700`}>
                            Added to Pipeline
                        </span>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="w-full h-auto">
                <p className="w-full h-auto text-lg md:text-2xl font-medium tracking-[-0.02em] text-ink leading-snug break-words whitespace-pre-wrap">
                    {belief}
                </p>
            </div>

            {/* Minimal Actions - Always visible on mobile, hover on desktop */}
            <div className="mt-5 flex flex-wrap items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                {status === 'pending' ? (
                    <>
                        <button
                            onClick={() => handleFeedback('accurate')}
                            className={ACTION}
                        >
                            <Check size={14} /> Accurate
                        </button>
                        <button
                            onClick={() => handleFeedback('misses')}
                            className={ACTION}
                        >
                            <X size={14} /> Misses
                        </button>
                        <button
                            onClick={() => handleFeedback('clarify')}
                            className={ACTION}
                        >
                            <MessageSquare size={14} /> Clarify
                        </button>
                        <div className="w-px h-4 bg-line mx-1" />
                        {onWriteAbout && !addedToPipeline && (
                            <button
                                onClick={handleWriteAbout}
                                disabled={writingAbout}
                                className="h-9 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                                {writingAbout ? (
                                    <><Spinner size={14} /> Adding...</>
                                ) : (
                                    <><Pen size={14} /> Write about this</>
                                )}
                            </button>
                        )}
                    </>
                ) : (
                    <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                        <Check size={14} className="text-ember-500" /> Feedback saved
                    </span>
                )}
            </div>

            {/* Source Expansion */}
            {expanded && (
                <div className="mt-5 pl-4 border-l-2 border-line">
                    <p className="text-sm text-ink-soft italic">
                        {context && context.length > 5 ? context : "No specific context available yet."}
                    </p>
                </div>
            )}
        </div>
    );
}
