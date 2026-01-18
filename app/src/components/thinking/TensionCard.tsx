"use client";

import { useState } from "react";
import { X, Check, Lightbulb } from "lucide-react";

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
        setTimeout(() => setDismissed(true), 1200);
    };

    if (dismissed) return null;

    return (
        <div className="group relative bg-white border-b border-gray-100 py-10 px-4 hover:bg-gray-50/30 transition-colors">

            {/* Classification Badge - Only if Classified */}
            {classification !== 'pending' && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                    <span className="text-[10px] uppercase tracking-widest font-medium text-gray-500">
                        {classification.replace('_', ' ')}
                    </span>
                </div>
            )}

            {/* Main Tension Statement */}
            <h3 className="text-xl font-medium text-gray-900 mb-8 max-w-2xl leading-snug">
                {tension}
            </h3>

            {/* The Conflict - Minimal Text Stack */}
            <div className="space-y-6 pl-6 border-l border-gray-200">
                <div>
                    <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2">Statement A</span>
                    <p className="text-base font-serif italic text-gray-600 leading-relaxed">
                        "{sideA}"
                    </p>
                </div>
                <div>
                    <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2">Statement B</span>
                    <p className="text-base font-serif italic text-gray-600 leading-relaxed">
                        "{sideB}"
                    </p>
                </div>
            </div>

            {/* Actions - Subtle Row */}
            {classification === 'pending' && (
                <div className="mt-8 flex items-center gap-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">Classify:</span>

                    <button
                        onClick={() => handleClassify('inconsistency')}
                        className="text-xs font-medium text-gray-400 hover:text-red-600 transition-colors flex items-center gap-2"
                    >
                        <X size={14} /> Inconsistency
                    </button>

                    <button
                        onClick={() => handleClassify('intentional_nuance')}
                        className="text-xs font-medium text-gray-400 hover:text-green-600 transition-colors flex items-center gap-2"
                    >
                        <Check size={14} /> Nuance
                    </button>

                    <button
                        onClick={() => handleClassify('explore')}
                        className="text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-2"
                    >
                        <Lightbulb size={14} /> Explore
                    </button>
                </div>
            )}
        </div>
    );
}
