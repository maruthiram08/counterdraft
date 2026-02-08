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
            <div className="bg-green-50 border border-green-100 p-3 rounded-lg flex items-center justify-between animate-fade-in mb-4">
                <span className="text-sm text-green-700 font-medium">Thanks for the feedback! I&apos;ll learn from this.</span>
                <button onClick={onDismiss} className="text-green-400 hover:text-green-600">
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl shadow-sm animate-slide-up mb-4">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-800">
                    <ThumbsDown size={16} className="text-amber-600" />
                    <span className="text-sm font-bold">Refinement rejected</span>
                </div>
                <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600">
                    <X size={16} />
                </button>
            </div>

            <p className="text-xs text-amber-700 mb-4 bg-amber-100/50 p-2 rounded italic">
                &quot;{instruction}&quot;
            </p>

            <p className="text-xs font-medium text-amber-900 mb-2">What went wrong?</p>
            <div className="flex flex-wrap gap-2">
                {reasons.map(reason => (
                    <button
                        key={reason}
                        onClick={() => {
                            onFeedback(reason);
                            setSubmitted(true);
                        }}
                        className="px-3 py-1.5 bg-white border border-amber-200 text-[10px] font-bold text-amber-700 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all shadow-xs"
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
                    className="px-3 py-1.5 bg-white border border-amber-200 text-[10px] font-bold text-amber-700 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all flex items-center gap-1 shadow-xs"
                >
                    <MessageSquare size={10} /> Other
                </button>
            </div>
        </div>
    );
}
