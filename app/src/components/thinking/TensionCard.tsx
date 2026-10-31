"use client";

import { useState } from "react";
import { X, Check, Lightbulb, Rocket } from "lucide-react";
import { Spinner } from "@/components/shared/Loading";

interface TensionCardProps {
    tension: string;
    sideA: string;
    sideB: string;
    tensionId?: string;
    initialClassification?: 'pending' | 'inconsistency' | 'intentional_nuance' | 'explore';
    onClassify?: (tensionId: string, classification: 'inconsistency' | 'intentional_nuance' | 'explore') => void;
    onTurnIntoIdea?: (tension: { id: string; tension: string; sideA: string; sideB: string }) => Promise<void>;
}

export function TensionCard({ tension, sideA, sideB, tensionId, initialClassification = 'pending', onClassify, onTurnIntoIdea }: TensionCardProps) {
    const [classification, setClassification] = useState(initialClassification);
    const [dismissed, setDismissed] = useState(false);
    const [converting, setConverting] = useState(false);
    const [converted, setConverted] = useState(false);

    const handleClassify = (newClassification: 'inconsistency' | 'intentional_nuance' | 'explore') => {
        setClassification(newClassification);
        if (onClassify && tensionId) {
            onClassify(tensionId, newClassification);
        }
        // Don't dismiss explore classification - they might want to turn into idea
        if (newClassification !== 'explore') {
            setTimeout(() => setDismissed(true), 1200);
        }
    };

    const handleTurnIntoIdea = async () => {
        if (!onTurnIntoIdea || !tensionId) return;
        setConverting(true);
        try {
            await onTurnIntoIdea({ id: tensionId, tension, sideA, sideB });
            setConverted(true);
            setTimeout(() => setDismissed(true), 1500);
        } catch (err) {
            console.error('Failed to convert tension to idea:', err);
        } finally {
            setConverting(false);
        }
    };

    if (dismissed) return null;

    return (
        <div className="group relative bg-surface rounded-tile shadow-card p-5 md:p-6 hover:shadow-float hover:-translate-y-0.5 transition-all">

            {/* Classification Badge - Only if Classified */}
            {classification !== 'pending' && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="inline-block h-7 leading-7 px-3 rounded-full bg-ink text-white text-xs font-medium lowercase first-letter:uppercase">
                        {classification.replace('_', ' ')}
                    </span>
                    {converted && (
                        <span className="inline-flex items-center h-7 px-3 rounded-full bg-sage-100 text-sage-700 text-xs font-medium">
                            → Added to Pipeline
                        </span>
                    )}
                </div>
            )}

            {/* Main Tension Statement */}
            <h3 className="text-[17px] md:text-xl font-medium tracking-[-0.01em] text-ink mb-6 leading-snug whitespace-pre-wrap">
                {tension}
            </h3>

            {/* The Conflict - Minimal Text Stack */}
            <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-canvas shadow-well rounded-tile p-4">
                    <span className="block text-sm text-ink-muted mb-2">Statement A</span>
                    <p className="text-base italic text-ink-soft leading-relaxed">
                        &quot;{sideA}&quot;
                    </p>
                </div>
                <div className="bg-canvas shadow-well rounded-tile p-4">
                    <span className="block text-sm text-ink-muted mb-2">Statement B</span>
                    <p className="text-base italic text-ink-soft leading-relaxed">
                        &quot;{sideB}&quot;
                    </p>
                </div>
            </div>

            {/* Actions - Subtle Row */}
            {classification === 'pending' && (
                <div className="mt-6 flex flex-wrap items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm text-ink-muted mr-1">Classify:</span>

                    <button
                        onClick={() => handleClassify('inconsistency')}
                        className="h-10 md:h-9 px-3 rounded-full text-xs font-medium text-ink-muted hover:text-rose-700 hover:bg-rose-100 active:shadow-pressed transition-all flex items-center gap-1.5"
                    >
                        <X size={14} /> Inconsistency
                    </button>

                    <button
                        onClick={() => handleClassify('intentional_nuance')}
                        className="h-10 md:h-9 px-3 rounded-full text-xs font-medium text-ink-muted hover:text-sage-700 hover:bg-sage-100 active:shadow-pressed transition-all flex items-center gap-1.5"
                    >
                        <Check size={14} /> Nuance
                    </button>

                    <button
                        onClick={() => handleClassify('explore')}
                        className="h-10 md:h-9 px-3 rounded-full text-xs font-medium text-ink-muted hover:text-dusk-700 hover:bg-dusk-100 active:shadow-pressed transition-all flex items-center gap-1.5"
                    >
                        <Lightbulb size={14} /> Explore
                    </button>
                </div>
            )}

            {/* Turn into Post Idea - Show after "Explore" classification */}
            {classification === 'explore' && !converted && onTurnIntoIdea && (
                <div className="mt-6 p-4 bg-ember-50 rounded-tile">
                    <p className="text-sm text-ember-700 mb-3">
                        This tension could make a great post! Explore the nuance between these perspectives.
                    </p>
                    <button
                        onClick={handleTurnIntoIdea}
                        disabled={converting}
                        className="flex items-center gap-2 h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        {converting ? (
                            <><Spinner size={16} /> Converting...</>
                        ) : (
                            <><Rocket size={16} /> Turn into Post Idea</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
