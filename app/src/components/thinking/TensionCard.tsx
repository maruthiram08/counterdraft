"use client";

import { useState } from "react";
import { AlertTriangle, X, Check, Lightbulb, HelpCircle } from "lucide-react";

interface TensionCardProps {
    tension: string;
    sideA: string;
    sideB: string;
    tensionId?: string;
    initialClassification?: 'pending' | 'inconsistency' | 'intentional_nuance' | 'explore';
    onClassify?: (tensionId: string, classification: 'inconsistency' | 'intentional_nuance' | 'explore') => void;
}

export function TensionCard({ tension, sideA, sideB, tensionId, initialClassification = 'pending', onClassify }: TensionCardProps) {
    const [classification, setClassification] = useState(initialClassification);
    const [dismissed, setDismissed] = useState(false);

    const handleClassify = (newClassification: 'inconsistency' | 'intentional_nuance' | 'explore') => {
        setClassification(newClassification);

        if (onClassify && tensionId) {
            onClassify(tensionId, newClassification);
        }

        // Auto-dismiss after 1.5s
        setTimeout(() => setDismissed(true), 1500);
    };

    if (dismissed) return null;

    const classificationStyles = {
        pending: "",
        inconsistency: "border-red-300 bg-red-50/50 ring-1 ring-red-200",
        intentional_nuance: "border-green-300 bg-green-50/50 ring-1 ring-green-200",
        explore: "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200"
    };

    const classificationMessages = {
        pending: null,
        inconsistency: { icon: <X size={14} className="text-red-600" />, text: "Marked as inconsistency", color: "text-red-600" },
        intentional_nuance: { icon: <Check size={14} className="text-green-600" />, text: "Marked as intentional nuance", color: "text-green-600" },
        explore: { icon: <Lightbulb size={14} className="text-blue-600" />, text: "Will explore this", color: "text-blue-600" }
    };

    return (
        <div className={`card border-l-4 border-l-amber-400 transition-all duration-300 ${classificationStyles[classification]}`}>
            <div className="flex items-center gap-2 mb-4 text-amber-600">
                <AlertTriangle size={18} />
                <span className="text-xs font-bold uppercase tracking-wide">
                    {classification === 'pending' ? 'Unresolved Tension' : 'Resolved'}
                </span>
            </div>

            <h3 className="text-xl font-semibold mb-4">
                {tension}
            </h3>

            {/* Status Message */}
            {classification !== 'pending' && classificationMessages[classification] && (
                <div className={`flex items-center gap-2 mb-4 text-sm ${classificationMessages[classification]?.color}`}>
                    {classificationMessages[classification]?.icon}
                    <span>{classificationMessages[classification]?.text}</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[var(--surface)] rounded border border-[var(--border)]">
                    <span className="block text-xs font-medium text-[var(--text-subtle)] mb-2">You explicitly said:</span>
                    <p className="text-sm italic">"{sideA}"</p>
                </div>
                <div className="p-4 bg-[var(--surface)] rounded border border-[var(--border)]">
                    <span className="block text-xs font-medium text-[var(--text-subtle)] mb-2">But you also implied:</span>
                    <p className="text-sm italic">"{sideB}"</p>
                </div>
            </div>

            {/* Classification Buttons */}
            {classification === 'pending' && (
                <div className="flex items-center gap-2 border-t border-[var(--border)] pt-4">
                    <span className="text-xs text-[var(--text-muted)] mr-2">How do you hold these?</span>

                    <button
                        onClick={() => handleClassify('inconsistency')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-medium transition-all duration-200 hover:bg-red-50 text-[var(--text-muted)] hover:text-red-700"
                    >
                        <X size={16} /> Inconsistency
                    </button>

                    <div className="w-px h-4 bg-[var(--border)]" />

                    <button
                        onClick={() => handleClassify('intentional_nuance')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-medium transition-all duration-200 hover:bg-green-50 text-[var(--text-muted)] hover:text-green-700"
                    >
                        <Check size={16} /> Nuance
                    </button>

                    <div className="w-px h-4 bg-[var(--border)]" />

                    <button
                        onClick={() => handleClassify('explore')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-medium transition-all duration-200 hover:bg-blue-50 text-[var(--text-muted)] hover:text-blue-700"
                    >
                        <Lightbulb size={16} /> Explore
                    </button>
                </div>
            )}
        </div>
    );
}

