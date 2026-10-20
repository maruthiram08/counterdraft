'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Users, Scale } from 'lucide-react';
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
        references?: Partial<ContentReference>[];
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
    const [audience, setAudience] = useState('');
    const [stance, setStance] = useState<Stance | null>(null);
    const [references, setReferences] = useState<(ContentReference & { file?: File })[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Brain State
    const [confidence, setConfidence] = useState<ConfidenceResult | null>(null);
    const [isWhyDrawerOpen, setIsWhyDrawerOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleClose = useCallback(() => {
        // Confirm if fields are filled
        if (hook || outcome || audience || stance) {
            if (!confirm('You have unsaved changes. Discard draft?')) {
                return;
            }
        }
        onClose();
        // Reset form
        setHook('');
        setOutcome(null);
        setAudience('');
        setStance(null);
        setReferences([]);
        setErrors([]);
        setConfidence(null);
        setIsWhyDrawerOpen(false);
    }, [hook, outcome, audience, stance, onClose]);

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
                        audience: audience ? { role: audience, pain: '' } : undefined
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
    }, [debouncedHook, audience, outcome]);

    // Pre-fill form if triggered from belief/tension/artifact
    useEffect(() => {
        if (prefill) {
            if (prefill.hook) setHook(prefill.hook);
            if (prefill.outcome) setOutcome(prefill.outcome);
            if (prefill.stance) setStance(prefill.stance);
            if (prefill.references && prefill.references.length > 0) {
                const validRefs: (ContentReference & { file?: File })[] = prefill.references.map(ref => ({
                    id: ref.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
                    contentItemId: ref.contentItemId || '',
                    referenceType: ref.referenceType || 'text',
                    title: ref.title || 'Untitled Reference',
                    content: ref.content,
                    url: ref.url,
                    filePath: ref.filePath,
                    createdAt: ref.createdAt || new Date(),
                    file: undefined
                }));
                setReferences(validRefs);
            }
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
    }, [isOpen, handleClose]);

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

        // Map single audience string to object for backend compatibility
        const audienceObj: Audience | undefined = audience
            ? {
                role: audience,
                pain: '', // Simplified for friction reduction
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
            audience: audienceObj,
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
                className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-40"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-canvas rounded-card shadow-float w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 md:px-8 md:pt-8 pb-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-ember-500" size={22} />
                            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">New Draft</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 md:px-8 space-y-8">
                        {/* Intro Text */}
                        <p className="text-ink-soft -mt-4 mb-4">Define your intent, and the Brain will guide the rest.</p>
                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="bg-rose-100 rounded-tile p-4">
                                <p className="text-sm font-medium text-rose-700 mb-2">
                                    Please fix the following errors:
                                </p>
                                <ul className="list-disc list-inside text-sm text-rose-700">
                                    {errors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Section 1: Topic Input */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-ink mb-2">
                                What do you want to write about?
                            </label>
                            <div className="relative">
                                <textarea
                                    value={hook}
                                    onChange={(e) => setHook(e.target.value)}
                                    placeholder="Type or paste your idea here..."
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 resize-none pr-10"
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
                            <p className="text-xs text-ink-muted mt-2 flex justify-between">
                                <span>{hook.length}/500 characters</span>
                                {confidence && (
                                    <span className="text-ink-muted italic text-xs">AI Confidence: {confidence.score}/100</span>
                                )}
                            </p>
                        </div>

                        {/* Section 2: Outcome Picker (Pills) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                                    <span className="text-ember-500">◎</span> What is the goal? (The Outcome)
                                </label>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(['authority', 'engagement', 'conversion', 'connection'] as Outcome[]).map(
                                    (opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setOutcome(opt)}
                                            className={`h-11 px-3 rounded-full transition-all text-sm font-medium capitalize ${outcome === opt
                                                ? 'bg-canvas shadow-pressed text-ember-600'
                                                : 'bg-canvas shadow-raised text-ink-soft hover:text-ink'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Split Row: Audience & Stance */}
                        <div className="grid md:grid-cols-2 gap-8">

                            {/* Section 3: Audience (Smart Fill) */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                                    <Users size={16} className="text-ember-500" /> Who is this for?
                                </label>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value)}
                                        placeholder="e.g. Founders, Engineers..."
                                        className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                                        maxLength={100}
                                    />
                                    {/* Smart Audeince Pills */}
                                    <div className="flex flex-wrap gap-2">
                                        {['Founders', 'Engineers', 'Investors', 'Designers', 'Overwhelmed'].map(a => (
                                            <button
                                                key={a}
                                                onClick={() => setAudience(a)}
                                                className="h-7 px-3 rounded-full bg-canvas shadow-raised text-ink-soft text-xs font-medium hover:text-ember-600 active:shadow-pressed transition-all"
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Stance Toggle */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                                    <Scale size={16} className="text-ember-500" /> What&apos;s your stance?
                                </label>
                                <div className="flex flex-col gap-2">
                                    {(['supportive', 'contrarian', 'exploratory'] as Stance[]).map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setStance(opt)}
                                            className={`w-full h-11 px-4 rounded-full text-left transition-all text-sm font-medium capitalize flex items-center justify-between ${stance === opt
                                                ? 'bg-canvas shadow-pressed text-ember-600'
                                                : 'bg-canvas shadow-raised text-ink-soft hover:text-ink'
                                                }`}
                                        >
                                            {opt}
                                            {stance === opt && <div className="w-2 h-2 rounded-full bg-ember-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Section 5: References */}
                        <div className="pt-2">
                            <ReferenceSection
                                references={references}
                                onAdd={(ref) => setReferences(prev => [...prev, ref])}
                                onRemove={(id) => setReferences(prev => prev.filter(r => r.id !== id))}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 pb-6 pt-2 md:px-8 md:pb-8">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Start Research →'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
