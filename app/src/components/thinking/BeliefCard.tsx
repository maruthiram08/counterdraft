"use client";

import { useState } from "react";
import { Check, X, MessageSquare, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

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
        console.log(`[Feedback] Belief: "${belief.substring(0, 30)}..." → ${newStatus}`);
        if (onFeedback && beliefId) {
            onFeedback(beliefId, newStatus);
        }

        // Auto-dismiss after 1.5 seconds
        setTimeout(() => {
            setDismissed(true);
        }, 1500);
    };

    // Hide the card completely once dismissed
    if (dismissed) {
        return null;
    }

    const typeColors = {
        core: "bg-green-100 text-green-700",
        emerging: "bg-blue-100 text-blue-700",
        overused: "bg-amber-100 text-amber-700",
    };

    // Card border/bg based on feedback status
    const cardStyles = {
        pending: "",
        accurate: "border-green-300 bg-green-50/50 ring-1 ring-green-200",
        misses: "border-red-300 bg-red-50/50 ring-1 ring-red-200",
        clarify: "border-gray-300 bg-gray-50/50 ring-1 ring-gray-200",
    };

    const statusMessages = {
        pending: null,
        accurate: { icon: <CheckCircle size={14} className="text-green-600" />, text: "Marked as accurate", color: "text-green-600" },
        misses: { icon: <X size={14} className="text-red-600" />, text: "Marked as inaccurate", color: "text-red-600" },
        clarify: { icon: <MessageSquare size={14} className="text-gray-600" />, text: "Needs clarification", color: "text-gray-600" },
    };

    return (
        <div className={`card transition-all duration-300 ${cardStyles[status]}`}>
            <div className="flex justify-between items-start mb-4">
                <span className={`badge ${typeColors[type]} px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide`}>
                    {type} Belief
                </span>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[var(--text-subtle)] hover:text-[var(--foreground)] text-xs flex items-center gap-1"
                >
                    {sourceCount} sources
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            <p className="text-lg font-medium leading-relaxed mb-4">
                {belief}
            </p>

            {/* Feedback Status Message */}
            {status !== 'pending' && statusMessages[status] && (
                <div className={`flex items-center gap-2 mb-4 text-sm ${statusMessages[status]?.color}`}>
                    {statusMessages[status]?.icon}
                    <span>{statusMessages[status]?.text}</span>
                </div>
            )}

            {expanded && (
                <div className="mb-4 p-4 bg-[var(--surface)] rounded text-sm text-[var(--text-muted)] italic border border-[var(--border)]">
                    "Source snippet reference goes here..."
                </div>
            )}

            {/* ASSERTION INTERFACE */}
            <div className="flex items-center gap-2 border-t border-[var(--border)] pt-4 mt-auto">
                <button
                    onClick={() => handleFeedback('accurate')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-medium transition-all duration-200 ${status === 'accurate'
                        ? 'bg-green-600 text-white shadow-sm scale-[1.02]'
                        : 'hover:bg-green-50 text-[var(--text-muted)] hover:text-green-700'
                        }`}
                >
                    <Check size={16} /> Accurate
                </button>

                <div className="w-px h-4 bg-[var(--border)]" />

                <button
                    onClick={() => handleFeedback('misses')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-medium transition-all duration-200 ${status === 'misses'
                        ? 'bg-red-600 text-white shadow-sm scale-[1.02]'
                        : 'hover:bg-red-50 text-[var(--text-muted)] hover:text-red-700'
                        }`}
                >
                    <X size={16} /> Misses
                </button>

                <div className="w-px h-4 bg-[var(--border)]" />

                <button
                    onClick={() => handleFeedback('clarify')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-medium transition-all duration-200 ${status === 'clarify'
                        ? 'bg-gray-700 text-white shadow-sm scale-[1.02]'
                        : 'hover:bg-gray-100 text-[var(--text-muted)] hover:text-gray-800'
                        }`}
                >
                    <MessageSquare size={16} /> Clarify
                </button>
            </div>
        </div>
    );
}

