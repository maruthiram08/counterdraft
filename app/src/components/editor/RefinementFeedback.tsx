"use client";

import { useState } from 'react';
import { X, MessageSquare, ThumbsDown } from 'lucide-react';

interface RefinementFeedbackProps {
    instruction: string;
    onFeedback: (reason: string) => void;
    onDismiss: () => void;
}

export function RefinementFeedback({ instruction, onFeedback, onDismiss }: RefinementFeedbackProps) {
    const [submitted, setSubmitted] = useState(false);

    const reasons = [
        "Too formal",
        "Lost my voice",
        "Too wordy",
        "Wrong tone",
        "Changed meaning"
    ];

    if (submitted) {
        return (
            <div className="bg-sage-100 p-4 rounded-tile shadow-raised flex items-center justify-between animate-fade-in mb-4">
                <span className="text-sm text-sage-700 font-medium">Thanks for the feedback! I&apos;ll learn from this.</span>
                <button onClick={onDismiss} className="w-8 h-8 rounded-full flex items-center justify-center text-sage-700/70 hover:text-sage-700 active:shadow-pressed">
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-surface p-5 rounded-tile shadow-card animate-slide-up mb-4">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-ink">
                    <ThumbsDown size={16} className="text-sand-500" />
                    <span className="text-sm font-medium">Refinement rejected</span>
                </div>
                <button onClick={onDismiss} className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed">
                    <X size={16} />
                </button>
            </div>

            <p className="text-xs text-ink-soft mb-4 bg-canvas shadow-well px-3 py-2 rounded-2xl italic">
                &quot;{instruction}&quot;
            </p>

            <p className="text-sm text-ink-muted mb-2">What went wrong?</p>
            <div className="flex flex-wrap gap-2">
                {reasons.map(reason => (
                    <button
                        key={reason}
                        onClick={() => {
                            onFeedback(reason);
                            setSubmitted(true);
                        }}
                        className="h-8 px-3.5 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all"
                    >
                        {reason}
                    </button>
                ))}
                <button
                    onClick={() => {
                        const custom = prompt("What was wrong with the refinement?");
                        if (custom) {
                            onFeedback(custom);
                            setSubmitted(true);
                        }
                    }}
                    className="h-8 px-3.5 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all flex items-center gap-1"
                >
                    <MessageSquare size={10} /> Other
                </button>
            </div>
        </div>
    );
}
