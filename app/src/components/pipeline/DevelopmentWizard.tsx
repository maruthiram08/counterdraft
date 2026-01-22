"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Loader2, Check, RefreshCw, X, Download, Plus, AlertTriangle } from "lucide-react";
import { BrainHeaderPanel } from "./BrainHeaderPanel";
import { BrainMetadata } from "@/types";
import { ResearchItem } from "./ResearchItem";

interface ResearchPoint {
    text: string;
    notes: string[];
    isNew?: boolean;
}

interface DeepDiveData {
    research: ResearchPoint[];
    insights: ResearchPoint[];
}

interface ContentItem {
    id: string;
    hook: string;
    angle?: string;
    format?: string;
    deep_dive?: {
        research: (string | ResearchPoint)[];
        insights: (string | ResearchPoint)[];
    };
    outline?: {
        sections: string[];
    };
    brain_metadata?: BrainMetadata;
    dev_step?: string;
    draft_content?: string;
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

    // Deep Dive state - Now using rich objects
    const [deepDive, setDeepDive] = useState<DeepDiveData | null>(null);

    // Outline state - Now using rich objects
    const [outline, setOutline] = useState<ResearchPoint[]>([]);
    const [outlineApproved, setOutlineApproved] = useState(false);

    // Draft state
    const [draftContent, setDraftContent] = useState('');

    // Global Context
    const [globalContext, setGlobalContext] = useState("");
    const [showContextPanel, setShowContextPanel] = useState(false);
    const [refiningItems, setRefiningItems] = useState<{ type: 'research' | 'insights', index: number }[]>([]);

    const [localBrainMetadata, setLocalBrainMetadata] = useState<BrainMetadata | undefined>(item.brain_metadata);
    const [showStrategyWarning, setShowStrategyWarning] = useState(false);

    const handleUpdateBrainMetadata = (metadata: BrainMetadata) => {
        setLocalBrainMetadata(metadata);
        saveProgress({ brain_metadata: metadata });
    };

    // Persistence helper
    const saveProgress = async (updates: any) => {
        try {
            await fetch('/api/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    ...updates
                }),
            });
        } catch (e) {
            console.error("Failed to save progress", e);
        }
    };

    const normalizeDeepDive = (data: any): DeepDiveData | null => {
        if (!data) return null;

        const normalizeList = (list: any[]): ResearchPoint[] => {
            if (!list) return [];
            return list.map(item => {
                if (typeof item === 'string') {
                    return { text: item, notes: [] };
                }
                return item as ResearchPoint;
            });
        };

        return {
            research: normalizeList(data.research),
            insights: normalizeList(data.insights)
        };
    };

    const normalizeOutline = (data: any): ResearchPoint[] => {
        if (!data || !data.sections) return [];
        return data.sections.map((s: any) => {
            if (typeof s === 'string') return { text: s, notes: [] };
            return s as ResearchPoint;
        });
    };

    const runDeepDive = async (mode: 'initial' | 'reset' | 'append' = 'initial') => {
        if (mode === 'reset') {
            if (!confirm("This will clear current findings and regenerate from scratch. Continue?")) return;
        }

        setLoading(true);
        saveProgress({ dev_step: 'deep_dive_in_progress' });
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deep_dive',
                    hook: item.hook,
                    angle: item.angle,
                    references: localBrainMetadata?.references || [],
                    userContext: globalContext,
                    brainMetadata: localBrainMetadata
                }),
            });
            const data = await res.json();

            // Convert strings to objects
            const richData = normalizeDeepDive(data.deep_dive);

            if (richData) {
                if (mode === 'append' && deepDive) {
                    // Append new items, marking them as new
                    const newResearch = richData.research.map(r => ({ ...r, isNew: true }));
                    const newInsights = richData.insights.map(i => ({ ...i, isNew: true }));

                    const mergedData = {
                        research: [...deepDive.research, ...newResearch],
                        insights: [...deepDive.insights, ...newInsights]
                    };
                    setDeepDive(mergedData);

                    // Clear context panel on success
                    setGlobalContext("");
                    setShowContextPanel(false);

                    saveProgress({ deep_dive: mergedData });
                } else {
                    // Replace
                    setDeepDive(richData);
                    if (mode === 'reset') {
                        setGlobalContext(""); // Clear context on full reset too? Maybe keep it if user wants to retry with it. Actually clear is safer to avoid stale context.
                    }
                    saveProgress({
                        deep_dive: richData,
                        dev_step: 'deep_dive_complete'
                    });
                }
            }
        } catch (e) {
            console.error("Deep dive failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefinePoint = async (type: 'research' | 'insights', index: number, manualNote?: string) => {
        if (!deepDive) return;
        const currentItem = deepDive[type][index];

        // Combine system context, item notes, and the new manual note
        const itemNotesContext = currentItem.notes?.length
            ? `\n\nExisting notes for this point:\n${currentItem.notes.map(n => `- ${n}`).join('\n')}`
            : '';
        const combinedContext = `${globalContext}${itemNotesContext}${manualNote ? `\n\nNew user instruction: ${manualNote}` : ''}`;

        // Set loading state for this item
        setRefiningItems(prev => [...prev, { type, index }]);

        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'refine_point',
                    currentText: currentItem.text,
                    userContext: combinedContext,
                    type: type === 'research' ? 'research point' : 'insight'
                }),
            });

            const data = await res.json();

            if (data.refined) {
                handleUpdateItem(type, index, { text: data.refined });
            }
        } catch (err) {
            console.error('Refinement failed:', err);
        } finally {
            setRefiningItems(prev => prev.filter(i => !(i.type === type && i.index === index)));
        }
    };

    const generateOutline = async () => {
        setLoading(true);
        saveProgress({ dev_step: 'outline_in_progress' });
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'outline',
                    hook: item.hook,
                    angle: item.angle,
                    deep_dive: deepDive,
                    brainMetadata: localBrainMetadata,
                }),
            });
            const data = await res.json();
            const normalizedSections = normalizeOutline(data.outline);
            setOutline(normalizedSections);
            saveProgress({
                outline: { sections: normalizedSections },
                dev_step: 'outline_review'
            });
        } catch (err) {
            console.error('Outline generation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateDraft = async () => {
        setLoading(true);
        saveProgress({ dev_step: 'draft_in_progress' });
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'draft',
                    hook: item.hook,
                    angle: item.angle,
                    outline: outline,
                    brainMetadata: localBrainMetadata,
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
            // Strategic Gate Check
            const isVague = !localBrainMetadata?.outcome || !localBrainMetadata?.audience?.role || !localBrainMetadata?.audience?.pain;

            if (isVague && !showStrategyWarning) {
                setShowStrategyWarning(true);
                return;
            }

            setShowStrategyWarning(false);
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
            saveProgress({ dev_step: null });
            onComplete(draftContent);
        }
    };

    const confirmProceedVague = () => {
        setShowStrategyWarning(false);
        setStep('generate');
        generateDraft();
    };

    const handleExportResearch = () => {
        if (!deepDive) return;

        let content = `# Research: ${item.hook}\n\n`;

        content += `## Research Findings\n`;
        deepDive.research.forEach((r, i) => {
            content += `- ${r.text}\n`;
            r.notes.forEach(note => content += `  > Note: ${note}\n`);
        });

        content += `\n## Key Insights\n`;
        deepDive.insights.forEach((r, i) => {
            content += `- ${r.text}\n`;
            r.notes.forEach(note => content += `  > Note: ${note}\n`);
        });

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-${item.hook.slice(0, 20).replace(/\s+/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleUpdateItem = (type: 'research' | 'insights', index: number, updates: Partial<ResearchPoint>) => {
        if (!deepDive) return;

        const newList = [...deepDive[type]];
        newList[index] = { ...newList[index], ...updates };

        const newData = { ...deepDive, [type]: newList };
        setDeepDive(newData);
        saveProgress({ deep_dive: newData });
    };

    const handleUpdateOutlinePoint = (index: number, updates: Partial<ResearchPoint>) => {
        const newList = [...outline];
        newList[index] = { ...newList[index], ...updates };
        setOutline(newList);
        saveProgress({ outline: { sections: newList } });
    };

    const handleDeleteOutlinePoint = (index: number) => {
        const newList = outline.filter((_, i) => i !== index);
        setOutline(newList);
        saveProgress({ outline: { sections: newList } });
    };

    const handleAddOutlinePoint = () => {
        const newList = [...outline, { text: "New Section", notes: [], isNew: true }];
        setOutline(newList);
        saveProgress({ outline: { sections: newList } });
    };

    // Restoration logic
    useEffect(() => {
        // Hydrate data from item if available
        if (item.deep_dive && !deepDive) {
            setDeepDive(normalizeDeepDive(item.deep_dive));
        }
        if (item.outline && item.outline.sections && outline.length === 0) {
            setOutline(normalizeOutline(item.outline));
            setOutlineApproved(true); // Assume approved if persisted
        }
        if (item.draft_content && !draftContent) {
            setDraftContent(item.draft_content);
        }

        // Restore step based on saved progress
        if (!deepDive && !item.deep_dive && !loading) {
            // First time or empty
            runDeepDive();
        } else if (item.dev_step) {
            if (item.dev_step.includes('draft') || item.dev_step === 'complete') {
                setStep('generate');
            } else if (item.dev_step.includes('outline')) {
                setStep('outline');
            } else if (item.dev_step.includes('deep_dive')) {
                setStep('deep_dive');
            }
        } else {
            // Fallback inference
            if (item.draft_content) setStep('generate');
            else if (item.outline) setStep('outline');
            else setStep('deep_dive');
        }
    }, [item.id]); // Run once on mount/id change, or when item updates externally if we want live sync


    const steps = [
        { key: 'deep_dive', label: 'Research' },
        { key: 'outline', label: 'Outline' },
        { key: 'generate', label: 'Draft' },
    ];

    const currentStepIndex = steps.findIndex(s => s.key === step);

    return (
        <div className="fixed top-0 right-0 bottom-0 left-0 md:left-16 z-40 flex flex-col bg-white animate-in fade-in duration-200 border-l border-gray-200">
            <div className="w-full h-full flex flex-col bg-white">
                {/* Header Row: Title & Actions */}
                <div className="px-6 h-16 border-b flex items-center justify-between bg-white shrink-0 z-50">
                    <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">

                        <h2 className="font-serif text-lg font-medium text-gray-900 truncate" title={item.hook}>
                            {item.hook}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => {
                                saveProgress({ dev_step: step === 'deep_dive' ? 'deep_dive_in_progress' : step === 'outline' ? 'outline_in_progress' : 'draft_in_progress' });
                                onClose();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Save & Exit <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Steps Row: Progress Indicator */}
                <div className="px-6 py-2 bg-white border-b shrink-0 flex justify-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] z-40">
                    <div className="flex items-center gap-4">
                        {steps.map((s, i) => {
                            const isActive = s.key === step;
                            const isPast = i < currentStepIndex;
                            return (
                                <div key={s.key} className="flex items-center">
                                    <div
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${isActive
                                            ? 'bg-[var(--accent)] text-white shadow-sm ring-2 ring-[var(--accent)]/20'
                                            : isPast
                                                ? 'bg-green-50 text-green-700'
                                                : 'text-gray-400'
                                            }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-white/20' : isPast ? 'bg-green-200/50' : 'bg-gray-100'
                                            }`}>
                                            {isPast ? <Check size={10} strokeWidth={3} /> : i + 1}
                                        </span>
                                        <span>{s.label}</span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className={`w-12 h-[1px] mx-2 ${isPast ? 'bg-green-200' : 'bg-gray-100'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    <div className="max-w-6xl mx-auto p-6 md:p-8 min-h-full flex flex-col">
                        {/* Brain Context Panel */}
                        <BrainHeaderPanel
                            item={{ ...item, brain_metadata: localBrainMetadata } as any}
                            onUpdate={handleUpdateBrainMetadata}
                        />

                        {/* Deep Dive Step */}
                        {step === 'deep_dive' && (
                            <div className="space-y-6">


                                {/* Content or Loader */}
                                {loading ? (
                                    <div className="flex flex-col items-center py-12 text-gray-400 bg-white/50 rounded-lg border-2 border-dashed border-gray-100">
                                        <Loader2 size={32} className="animate-spin mb-4 text-[var(--accent)]" />
                                        <p className="animate-pulse">Analyzing context & generating insights...</p>
                                    </div>
                                ) : deepDive ? (
                                    <>
                                        <div className="flex justify-between items-center px-2">
                                            <p className="text-xs text-gray-500 italic">
                                                Tip: You can also refresh individual cards below to apply this context granularly.
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => runDeepDive('reset')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs transition-colors"
                                                    title="Clear and restart research"
                                                >
                                                    <RefreshCw size={14} /> Reset
                                                </button>
                                                <button
                                                    onClick={handleExportResearch}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                                                >
                                                    <Download size={14} /> Export
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                                    Research Findings
                                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Facts</span>
                                                </h3>
                                                <div className="space-y-3">
                                                    {deepDive.research.map((r, i) => (
                                                        <ResearchItem
                                                            key={`res-${i}`}
                                                            text={r.text}
                                                            notes={r.notes}
                                                            isNew={r.isNew}
                                                            loading={refiningItems.some(item => item.type === 'research' && item.index === i)}
                                                            onRefine={() => handleRefinePoint('research', i)}
                                                            onUpdate={(txt) => handleUpdateItem('research', i, { text: txt })}
                                                            onAddNote={(note) => {
                                                                handleUpdateItem('research', i, { notes: [...r.notes, note] });
                                                                handleRefinePoint('research', i, note);
                                                            }}
                                                            onDeleteNote={(nIdx) => handleUpdateItem('research', i, { notes: r.notes.filter((_, idx) => idx !== nIdx) })}
                                                            onDelete={() => {
                                                                const newData = { ...deepDive, research: deepDive.research.filter((_, idx) => idx !== i) };
                                                                setDeepDive(newData);
                                                                saveProgress({ deep_dive: newData });
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                                    Key Insights
                                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Angles</span>
                                                </h3>
                                                <div className="space-y-3">
                                                    {deepDive.insights.map((r, i) => (
                                                        <ResearchItem
                                                            key={`ins-${i}`}
                                                            text={r.text}
                                                            notes={r.notes}
                                                            isNew={r.isNew}
                                                            loading={refiningItems.some(item => item.type === 'insights' && item.index === i)}
                                                            onRefine={() => handleRefinePoint('insights', i)}
                                                            onUpdate={(txt) => handleUpdateItem('insights', i, { text: txt })}
                                                            onAddNote={(note) => {
                                                                handleUpdateItem('insights', i, { notes: [...r.notes, note] });
                                                                handleRefinePoint('insights', i, note);
                                                            }}
                                                            onDeleteNote={(nIdx) => handleUpdateItem('insights', i, { notes: r.notes.filter((_, idx) => idx !== nIdx) })}
                                                            onDelete={() => {
                                                                const newData = { ...deepDive, insights: deepDive.insights.filter((_, idx) => idx !== i) };
                                                                setDeepDive(newData);
                                                                saveProgress({ deep_dive: newData });
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-gray-500 text-center py-12">Starting research...</p>
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
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-medium text-gray-900">Proposed Outline</h3>
                                            <button
                                                onClick={handleAddOutlinePoint}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100 shadow-sm"
                                            >
                                                <Plus size={14} />
                                                Add Section
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {outline.map((section, i) => (
                                                <div key={`out-wrap-${i}`} className="flex items-start gap-3">
                                                    <span className="w-8 h-8 bg-[var(--accent)] text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1">
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <ResearchItem
                                                            key={`out-${i}`}
                                                            showBullet={false}
                                                            text={section.text}
                                                            notes={section.notes}
                                                            isNew={section.isNew}
                                                            onUpdate={(txt) => handleUpdateOutlinePoint(i, { text: txt })}
                                                            onAddNote={(note) => handleUpdateOutlinePoint(i, { notes: [...section.notes, note] })}
                                                            onDeleteNote={(nIdx) => handleUpdateOutlinePoint(i, { notes: section.notes.filter((_, idx) => idx !== nIdx) })}
                                                            onDelete={() => handleDeleteOutlinePoint(i)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <label className="flex items-center gap-2 mt-4 p-4 bg-green-50 rounded-lg border border-green-100 cursor-pointer hover:bg-green-100/50 transition-colors">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${outlineApproved ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300'}`}>
                                                {outlineApproved && <Check size={14} />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={outlineApproved}
                                                onChange={(e) => setOutlineApproved(e.target.checked)}
                                            />
                                            <span className="text-sm text-green-900 select-none">I approve this outline structure</span>
                                        </label>
                                    </>
                                ) : (
                                    <p className="text-gray-500">No outline generated.</p>
                                )}
                            </div>
                        )}

                        {/* Draft Step */}
                        {step === 'generate' && (
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="flex flex-col items-center py-12 text-gray-400">
                                        <Loader2 size={32} className="animate-spin mb-4" />
                                        <p>Writing your draft...</p>
                                    </div>
                                ) : draftContent ? (
                                    <div className="prose max-w-none">
                                        <textarea
                                            value={draftContent}
                                            readOnly
                                            className="w-full h-96 p-4 border rounded-lg bg-gray-50 font-mono text-sm resize-none focus:outline-none"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Ready to draft.</p>
                                )}
                            </div>
                        )}
                    </div>

                </div>
                {/* Bottom Sheet Context Panel */}
                {showContextPanel && (
                    <div className="absolute bottom-[72px] left-0 right-0 z-40 bg-white border-t border-[var(--accent)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="max-w-4xl mx-auto w-full">
                            <div className="flex justify-between items-center mb-4">
                                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                                    Refine Research
                                </label>
                                <button
                                    onClick={() => setShowContextPanel(false)}
                                    className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex gap-4">
                                <textarea
                                    value={globalContext}
                                    onChange={(e) => setGlobalContext(e.target.value)}
                                    disabled={loading}
                                    autoFocus
                                    placeholder="Paste a URL or describe missing angles (e.g., 'Include statistics about Gen Z usage')..."
                                    className="flex-1 text-sm p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 min-h-[80px] bg-gray-50 resize-none"
                                />
                                <div className="flex flex-col justify-end">
                                    <button
                                        onClick={() => runDeepDive('append')}
                                        disabled={loading || !globalContext.trim()}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all shadow-sm disabled:opacity-50 h-[80px]"
                                    >
                                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                        {loading ? "Updating..." : "Update"}
                                    </button>
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Findings will be appended. Existing notes preserved.
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        disabled={step === 'deep_dive' || loading}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div className="flex gap-3">
                        {step === 'deep_dive' && (
                            <button
                                onClick={() => {
                                    setShowContextPanel(true);
                                    // Optional: scroll to top
                                    document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={loading || !deepDive}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                            >
                                <RefreshCw size={14} /> Refine Research
                            </button>
                        )}

                        {step === 'generate' ? (
                            <button
                                onClick={handleComplete}
                                disabled={!draftContent || loading}
                                className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                                <Check size={16} /> Complete & Save
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={loading || (step === 'outline' && !outlineApproved) || (step === 'deep_dive' && !deepDive)}
                                className="px-6 py-2 bg-[var(--foreground)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                                Next Step <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Strategy Warning Overlay */}
                {showStrategyWarning && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-white/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="max-w-md w-full bg-white border border-amber-200 shadow-2xl rounded-2xl p-6 text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Wait, your strategy is vague!</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Without a specific **Goal** and **Audience**, the AI will generate a generic draft. High-quality posts need strategic precision.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowStrategyWarning(false)}
                                    className="w-full py-3 bg-[var(--accent)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Check size={18} />
                                    I'll fix the strategy
                                </button>
                                <button
                                    onClick={confirmProceedVague}
                                    className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    No, write a generic draft anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
