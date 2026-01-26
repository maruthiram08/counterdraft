'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { Outcome, Stance, Audience, ContentReference, ConfidenceResult } from '@/types';
import { ReferenceSection } from '@/components/common/ReferenceSection'; // Ensure this path is correct
import { ConfidenceIndicator } from '@/components/brain/ConfidenceIndicator';
import { WhyDrawer } from '@/components/brain/WhyDrawer';
// We need a debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

interface NewDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        hook: string;
        outcome: Outcome;
        audience?: Audience;
        stance?: Stance;
        references?: ContentReference[];
    }) => void;
    prefill?: {
        hook?: string;
        outcome?: Outcome;
        stance?: Stance;
        sourceType?: 'belief' | 'tension' | 'idea' | 'manual';
        sourceId?: string;
    };
}

export default function NewDraftModal({
    isOpen,
    onClose,
    onSubmit,
    prefill,
}: NewDraftModalProps) {
    const [hook, setHook] = useState('');
    const debouncedHook = useDebounce(hook, 1000); // 1s debounce

    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const [audienceRole, setAudienceRole] = useState('');
    const [audiencePain, setAudiencePain] = useState('');
    const [stance, setStance] = useState<Stance | null>(null);
    const [references, setReferences] = useState<(ContentReference & { file?: File })[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Brain State
    const [confidence, setConfidence] = useState<ConfidenceResult | null>(null);
    const [isWhyDrawerOpen, setIsWhyDrawerOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // AI Analysis (Debounced)
    useEffect(() => {
        const analyze = async () => {
            if (!debouncedHook || debouncedHook.length < 10) return;
            setIsAnalyzing(true);
            try {
                const res = await fetch('/api/brain/analyze', {
                    method: 'POST',
                    body: JSON.stringify({
                        topic: debouncedHook,
                        audience: audienceRole ? { role: audienceRole, pain: audiencePain } : undefined
                    })
                });
                const data = await res.json();
                if (data.confidence) setConfidence(data.confidence);
                if (data.outcome && !outcome) setOutcome(data.outcome); // Auto-suggest outcome if empty
            } catch (err) {
                console.error('Analysis failed', err);
            } finally {
                setIsAnalyzing(false);
            }
        };

        analyze();
    }, [debouncedHook, audienceRole, audiencePain]);

    // Pre-fill form if triggered from belief/tension
    useEffect(() => {
        if (prefill) {
            if (prefill.hook) setHook(prefill.hook);
            if (prefill.outcome) setOutcome(prefill.outcome);
            if (prefill.stance) setStance(prefill.stance);
        }
    }, [prefill]);

    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen]);

    const handleClose = () => {
        // Confirm if fields are filled
        if (hook || outcome || audienceRole || audiencePain || stance) {
            if (!confirm('You have unsaved changes. Discard draft?')) {
                return;
            }
        }
        onClose();
        // Reset form
        setHook('');
        setOutcome(null);
        setAudienceRole('');
        setAudiencePain('');
        setStance(null);
        setReferences([]);
        setErrors([]);
        setConfidence(null);
        setIsWhyDrawerOpen(false);
    };

    const validate = (): boolean => {
        const newErrors: string[] = [];

        if (!hook || hook.trim().length < 10) {
            newErrors.push('Topic must be at least 10 characters');
        }

        if (!outcome) {
            newErrors.push('Please select an outcome');
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);

        const audience:
            | Audience
            | undefined = audienceRole || audiencePain
                ? {
                    role: audienceRole,
                    pain: audiencePain,
                }
                : undefined;

        // Process references (upload files if needed)
        const processedReferences = await Promise.all(references.map(async (ref) => {
            if (ref.referenceType === 'file' && ref.file) {
                try {
                    const formData = new FormData();
                    formData.append('file', ref.file);

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) throw new Error('Upload failed');

                    const data = await res.json();
                    return {
                        ...ref,
                        file: undefined, // Remove raw file
                        url: data.url,   // Add public URL
                        filePath: data.path // Add storage path
                    };
                } catch (e) {
                    console.error('File upload failed', e);
                    return ref; // Fallback to storing without URL (or handle error)
                }
            }
            return ref;
        }));

        onSubmit({
            hook: hook.trim(),
            outcome: outcome!,
            audience,
            stance: stance || undefined,
            references: processedReferences,
        });

        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Drawers */}
            <WhyDrawer
                isOpen={isWhyDrawerOpen}
                onClose={() => setIsWhyDrawerOpen(false)}
                confidence={confidence}
            />

            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <h2 className="text-2xl font-semibold">✍️ New Draft</h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-4">
                                <p className="text-sm font-medium text-red-800 mb-2">
                                    Please fix the following errors:
                                </p>
                                <ul className="list-disc list-inside text-sm text-red-700">
                                    {errors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Section 1: Topic Input */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                What do you want to write about?
                            </label>
                            <div className="relative">
                                <textarea
                                    value={hook}
                                    onChange={(e) => setHook(e.target.value)}
                                    placeholder="Type or paste your idea here..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none pr-10"
                                    rows={4}
                                    maxLength={500}
                                />
                                {/* Confidence Indicator Overlay */}
                                {(confidence || isAnalyzing) && (
                                    <div className="absolute top-3 right-3">
                                        <ConfidenceIndicator
                                            level={confidence?.level || 'medium'}
                                            loading={isAnalyzing}
                                            onClick={() => setIsWhyDrawerOpen(true)}
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex justify-between">
                                <span>{hook.length}/500 characters</span>
                                {confidence && (
                                    <span className="text-gray-400 italic text-xs">AI Confidence: {confidence.score}/100</span>
                                )}
                            </p>
                        </div>

                        {/* Section 2: Outcome Picker */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    What should this post optimize for?
                                </label>
                                {isAnalyzing && <span className="text-xs text-blue-500 flex items-center gap-1"><Sparkles size={12} /> AI analyzing...</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {(['authority', 'engagement', 'conversion', 'connection'] as Outcome[]).map(
                                    (opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setOutcome(opt)}
                                            className={`px-4 py-3 rounded-lg border-2 transition capitalize ${outcome === opt
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Section 3: Audience Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Who is this for?
                            </label>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={audienceRole}
                                    onChange={(e) => setAudienceRole(e.target.value)}
                                    placeholder="Role: Startup founders, Product managers, etc."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    maxLength={50}
                                />
                                <input
                                    type="text"
                                    value={audiencePain}
                                    onChange={(e) => setAudiencePain(e.target.value)}
                                    placeholder="Pain: What problem are they facing right now?"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    maxLength={100}
                                />
                            </div>
                        </div

                        >

                        {/* Section 4: Stance Toggle */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your stance:
                            </label>
                            <div className="flex gap-3">
                                {(['supportive', 'contrarian', 'exploratory'] as Stance[]).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setStance(opt)}
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition capitalize ${stance === opt
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section 5: References */}
                        <div className="pt-2 border-t border-gray-100">
                            <ReferenceSection
                                references={references}
                                onAdd={(ref) => setReferences(prev => [...prev, ref])}
                                onRemove={(id) => setReferences(prev => prev.filter(r => r.id !== id))}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                        <button
                            onClick={handleClose}
                            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Start Research →'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
