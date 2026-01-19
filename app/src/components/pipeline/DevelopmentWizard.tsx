"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Loader2, Check, RefreshCw, X } from "lucide-react";

interface ContentItem {
    id: string;
    hook: string;
    angle?: string;
    format?: string;
    deep_dive?: {
        research: string[];
        insights: string[];
    };
    outline?: {
        sections: string[];
    };
}

interface DevelopmentWizardProps {
    item: ContentItem;
    onClose: () => void;
    onComplete: (draftContent: string) => void;
}

type WizardStep = 'deep_dive' | 'outline' | 'generate';

export function DevelopmentWizard({ item, onClose, onComplete }: DevelopmentWizardProps) {
    const [step, setStep] = useState<WizardStep>('deep_dive');
    const [loading, setLoading] = useState(false);

    // Deep Dive state
    const [deepDive, setDeepDive] = useState<{ research: string[]; insights: string[] } | null>(null);

    // Outline state
    const [outline, setOutline] = useState<string[]>([]);
    const [outlineApproved, setOutlineApproved] = useState(false);

    // Draft state
    const [draftContent, setDraftContent] = useState('');

    const runDeepDive = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deep_dive',
                    hook: item.hook,
                    angle: item.angle,
                }),
            });
            const data = await res.json();
            setDeepDive(data.deep_dive);
        } catch (err) {
            console.error('Deep dive failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateOutline = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'outline',
                    hook: item.hook,
                    angle: item.angle,
                    deep_dive: deepDive,
                }),
            });
            const data = await res.json();
            setOutline(data.outline?.sections || []);
        } catch (err) {
            console.error('Outline generation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateDraft = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'draft',
                    hook: item.hook,
                    angle: item.angle,
                    outline: outline,
                }),
            });
            const data = await res.json();
            setDraftContent(data.draft || '');
        } catch (err) {
            console.error('Draft generation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 'deep_dive' && deepDive) {
            setStep('outline');
            generateOutline();
        } else if (step === 'outline' && outlineApproved) {
            setStep('generate');
            generateDraft();
        }
    };

    const handleBack = () => {
        if (step === 'outline') setStep('deep_dive');
        else if (step === 'generate') setStep('outline');
    };

    const handleComplete = () => {
        if (draftContent) {
            onComplete(draftContent);
        }
    };

    // Start deep dive on mount
    useEffect(() => {
        if (!deepDive) {
            runDeepDive();
        }
    }, []);

    const steps = [
        { key: 'deep_dive', label: 'Research' },
        { key: 'outline', label: 'Outline' },
        { key: 'generate', label: 'Draft' },
    ];

    const currentStepIndex = steps.findIndex(s => s.key === step);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-medium text-gray-900">Developing: {item.hook?.slice(0, 50)}...</h2>
                        <p className="text-sm text-gray-500">AI-assisted content development</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-4 py-3 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                        {steps.map((s, i) => (
                            <div key={s.key} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i < currentStepIndex ? 'bg-green-500 text-white' :
                                    i === currentStepIndex ? 'bg-[var(--accent)] text-white' :
                                        'bg-gray-200 text-gray-500'
                                    }`}>
                                    {i < currentStepIndex ? <Check size={16} /> : i + 1}
                                </div>
                                <span className={`ml-2 text-sm ${i === currentStepIndex ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                                    {s.label}
                                </span>
                                {i < steps.length - 1 && (
                                    <div className={`w-16 h-0.5 mx-4 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Deep Dive Step */}
                    {step === 'deep_dive' && (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center py-12 text-gray-400">
                                    <Loader2 size={32} className="animate-spin mb-4" />
                                    <p>Researching your topic...</p>
                                </div>
                            ) : deepDive ? (
                                <>
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-2">Research Findings</h3>
                                        <ul className="space-y-2">
                                            {deepDive.research.map((r, i) => (
                                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <span className="text-[var(--accent)]">•</span> {r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-2">Key Insights</h3>
                                        <ul className="space-y-2">
                                            {deepDive.insights.map((ins, i) => (
                                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <span className="text-amber-500">★</span> {ins}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button
                                        onClick={runDeepDive}
                                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--accent)]"
                                    >
                                        <RefreshCw size={14} /> Redo research
                                    </button>
                                </>
                            ) : (
                                <p className="text-gray-500">Starting research...</p>
                            )}
                        </div>
                    )}

                    {/* Outline Step */}
                    {step === 'outline' && (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center py-12 text-gray-400">
                                    <Loader2 size={32} className="animate-spin mb-4" />
                                    <p>Generating outline...</p>
                                </div>
                            ) : outline.length > 0 ? (
                                <>
                                    <h3 className="font-medium text-gray-900 mb-2">Proposed Outline</h3>
                                    <ol className="space-y-2">
                                        {outline.map((section, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <span className="w-6 h-6 bg-[var(--accent)] text-white text-xs rounded-full flex items-center justify-center shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="text-sm text-gray-700">{section}</span>
                                            </li>
                                        ))}
                                    </ol>
                                    <div className="flex items-center gap-4 pt-4 border-t">
                                        <button
                                            onClick={() => setOutlineApproved(true)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${outlineApproved
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]'
                                                }`}
                                        >
                                            {outlineApproved ? <><Check size={16} /> Approved</> : 'Approve Outline'}
                                        </button>
                                        <button
                                            onClick={generateOutline}
                                            className="text-sm text-gray-500 hover:text-[var(--accent)]"
                                        >
                                            <RefreshCw size={14} className="inline mr-1" /> Regenerate
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500">Generating outline...</p>
                            )}
                        </div>
                    )}

                    {/* Generate Draft Step */}
                    {step === 'generate' && (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center py-12 text-gray-400">
                                    <Loader2 size={32} className="animate-spin mb-4" />
                                    <p>Writing your draft...</p>
                                </div>
                            ) : draftContent ? (
                                <>
                                    <h3 className="font-medium text-gray-900 mb-2">Generated Draft</h3>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{draftContent}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500">Generating draft...</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex items-center justify-between bg-gray-50">
                    <button
                        onClick={handleBack}
                        disabled={step === 'deep_dive'}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    {step === 'generate' && draftContent ? (
                        <button
                            onClick={handleComplete}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                        >
                            <Check size={16} /> Complete & Save Draft
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={
                                loading ||
                                (step === 'deep_dive' && !deepDive) ||
                                (step === 'outline' && !outlineApproved)
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-dark)] disabled:opacity-50"
                        >
                            Next <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
