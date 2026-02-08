"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, X, ArrowLeft, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { BrainHeaderPanel } from "./BrainHeaderPanel";
import { BrainMetadata } from "@/types";
import { LimitModal } from "../modal/LimitModal";

import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import { DeepDiveData, ResearchPoint, ContentItem, WizardStep } from "./wizard/types";
import { DeepDiveStep } from "./wizard/DeepDiveStep";
import { OutlineStep } from "./wizard/OutlineStep";
import { DraftStep } from "./wizard/DraftStep";
import { RefineContextPanel } from "./wizard/RefineContextPanel";
import { ThinkingLoader } from "./wizard/ThinkingLoader";

interface DevelopmentWizardProps {
    item: ContentItem;
    onClose: () => void;
    onComplete: (draftContent: string) => void;
}

type DeepDiveListItem = string | ResearchPoint | { text: string; notes?: string[] };
type DeepDivePayload = { research?: DeepDiveListItem[]; insights?: DeepDiveListItem[] };
type OutlineSection = string | ResearchPoint | { text: string; notes?: string[] };

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

    // Strategy Verification State
    const [strategyAnalysis, setStrategyAnalysis] = useState<{ analysis: string; score: number; suggestions: string[] } | null>(null);
    const [verifyingStrategy, setVerifyingStrategy] = useState(false);

    // Global Context
    const [globalContext, setGlobalContext] = useState("");
    const [showContextPanel, setShowContextPanel] = useState(false);
    const [localBrainMetadata, setLocalBrainMetadata] = useState<BrainMetadata | undefined>(() => {
        const legacyMetadata = (item as { brainMetadata?: BrainMetadata }).brainMetadata;
        let meta = item.brain_metadata || legacyMetadata;
        if (typeof meta === 'string') {
            try {
                meta = JSON.parse(meta);
            } catch (e) {
                console.error("Failed to parse brain_metadata", e);
            }
        }
        return meta;
    });

    const handleVerifyStrategy = async (contentOverride?: string) => {
        const textToVerify = contentOverride || draftContent;
        if (!textToVerify) return;

        setVerifyingStrategy(true);
        // Ensure context panel is open so user sees result
        setShowContextPanel(true);

        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify_strategy',
                    draft: textToVerify,
                    brainMetadata: item.brain_metadata
                })
            });

            const data = await res.json();
            if (res.ok) {
                setStrategyAnalysis(data);
                toast.success('Strategy analysis complete');
            } else {
                toast.error(data.error || 'Failed to verify strategy');
            }
        } catch (error) {
            console.error("Strategy verification failed:", error);
            toast.error('Verification failed');
        } finally {
            setVerifyingStrategy(false);
        }
    };

    const [fixingStrategy, setFixingStrategy] = useState(false);

    const handleAutoFix = async (instruction: string) => {
        if (!draftContent) return;
        setFixingStrategy(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'auto_fix_strategy',
                    draft: draftContent,
                    fix_instruction: instruction,
                    brainMetadata: item.brain_metadata
                })
            });

            const data = await res.json();
            if (res.ok && data.draft) {
                setDraftContent(data.draft);
                toast.success('Auto-fix applied! Re-verifying...');
                // Automatically re-run verification on the NEW content
                await handleVerifyStrategy(data.draft);
            } else {
                toast.error('Failed to apply fix');
            }
        } catch (error) {
            console.error("Auto-fix failed:", error);
            toast.error('Auto-fix failed');
        } finally {
            setFixingStrategy(false);
        }
    };

    // Limit State
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [limitState, setLimitState] = useState({ tier: 'free', usage: 0, limit: 0 });

    const checkLimit = async (): Promise<boolean> => {
        try {
            const res = await fetch('/api/user/status');
            const data = await res.json();
            if (data.usage && !data.usage.is_allowed) {
                setLimitState({
                    tier: data.usage.tier,
                    usage: data.usage.count,
                    limit: data.usage.limit
                });
                setLimitModalOpen(true);
                return false; // Blocked
            }
            return true; // Allowed
        } catch (e) {
            console.error("Limit check failed", e);
            return true;
        }
    };

    const [refiningItems, setRefiningItems] = useState<{ type: 'research' | 'insights', index: number }[]>([]);
    const [showStrategyWarning, setShowStrategyWarning] = useState(false);

    const handleUpdateBrainMetadata = (metadata: BrainMetadata) => {
        setLocalBrainMetadata(metadata);
        saveProgress({ brain_metadata: metadata });
    };

    // Persistence helper
    const saveProgress = useCallback(async (updates: Partial<ContentItem>) => {
        try {
            await fetch('/api/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    stage: 'developing', // FORCE STAGE UPDATE
                    ...updates
                }),
            });
        } catch (e) {
            console.error("Failed to save progress", e);
        }
    }, [item.id]);

    const normalizeDeepDive = (data: unknown): DeepDiveData | null => {
        const typedData = data as DeepDivePayload | null;
        if (!typedData) return null;

        const normalizeList = (list?: DeepDiveListItem[]): ResearchPoint[] => {
            if (!list) return [];
            return list.map((item) => {
                if (typeof item === 'string') {
                    return { text: item, notes: [] };
                }
                const notes = Array.isArray(item.notes) ? item.notes : [];
                return { text: item.text, notes };
            });
        };

        return {
            research: normalizeList(typedData.research),
            insights: normalizeList(typedData.insights)
        };
    };

    const normalizeOutline = (data: unknown): ResearchPoint[] => {
        const typedData = data as { sections?: OutlineSection[] } | null;
        if (!typedData || !typedData.sections) return [];
        return typedData.sections.map((s) => {
            let text = typeof s === 'string' ? s : s.text;
            // CLEAN PREFIXES
            text = text.replace(/^(Section\s+\d+[:.]?\s*|\d+[.:]\s*)/i, '').trim();
            if (typeof s === 'string') return { text, notes: [] };
            const notes = Array.isArray(s.notes) ? s.notes : [];
            return { text, notes };
        });
    };

    const runDeepDive = useCallback(async (mode: 'initial' | 'reset' | 'append' = 'initial') => {
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
            if (!res.ok) {
                const errData = await res.json();
                if (res.status === 403) {
                    setLimitState({
                        tier: errData.usage?.tier || 'free',
                        usage: errData.usage?.count || 0,
                        limit: errData.usage?.limit || 20
                    });
                    setLimitModalOpen(true);
                    setLoading(false);
                    return;
                }
                throw new Error(errData.error || `Server Error ${res.status}`);
            }

            const data = await res.json();
            const richData = normalizeDeepDive(data.deep_dive);

            if (richData) {
                if (mode === 'append' && deepDive) {
                    const newResearch = richData.research.map(r => ({ ...r, isNew: true }));
                    const newInsights = richData.insights.map(i => ({ ...i, isNew: true }));
                    const mergedData = {
                        research: [...deepDive.research, ...newResearch],
                        insights: [...deepDive.insights, ...newInsights]
                    };
                    setDeepDive(mergedData);
                    setGlobalContext("");
                    setShowContextPanel(false);
                    saveProgress({ deep_dive: mergedData });
                } else {
                    setDeepDive(richData);
                    if (mode === 'reset') setGlobalContext("");
                    saveProgress({
                        deep_dive: richData,
                        dev_step: 'deep_dive_complete'
                    });
                }
            } else {
                throw new Error("No research data returned.");
            }
        } catch (error: unknown) {
            console.error("Deep dive failed", error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Research Agent failed: ${message}. Please try again.`);
        } finally {
            setLoading(false);
        }
    }, [deepDive, globalContext, item.angle, item.hook, localBrainMetadata, saveProgress]);

    const handleRefinePoint = async (type: 'research' | 'insights', index: number, manualNote?: string) => {
        if (!deepDive) return;
        const currentItem = deepDive[type][index];

        const itemNotesContext = currentItem.notes?.length
            ? `\n\nExisting notes for this point:\n${currentItem.notes.map(n => `- ${n}`).join('\n')}`
            : '';
        const combinedContext = `${globalContext}${itemNotesContext}${manualNote ? `\n\nNew user instruction: ${manualNote}` : ''}`;

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
                    userContext: globalContext,
                    references: localBrainMetadata?.references || [],
                }),
            });
            if (!res.ok) {
                const errData = await res.json();
                if (res.status === 403) {
                    setLimitState({
                        tier: errData.usage?.tier || 'free',
                        usage: errData.usage?.count || 0,
                        limit: errData.usage?.limit || 20
                    });
                    setLimitModalOpen(true);
                    return;
                }
                throw new Error(errData.error || `Server Error ${res.status}`);
            }
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
                    userContext: globalContext,
                    references: localBrainMetadata?.references || [],
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                if (res.status === 403) {
                    setLimitState({
                        tier: errData.usage?.tier || 'free',
                        usage: errData.usage?.count || 0,
                        limit: errData.usage?.limit || 20
                    });
                    setLimitModalOpen(true);
                    setLoading(false);
                    return;
                }
                throw new Error(errData.error || `Server Error ${res.status}`);
            }

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
            const isVague = !localBrainMetadata?.outcome || !localBrainMetadata?.audience?.role;

            if (isVague && !showStrategyWarning) {
                setShowStrategyWarning(true);
                return;
            }

            checkLimit().then(allowed => {
                if (!allowed) return;
                setShowStrategyWarning(false);
                setStep('generate');
                generateDraft();
            });
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

    const handleExportResearch = () => {
        if (!deepDive) return;
        let content = `# Research: ${item.hook}\n\n`;
        content += `## Research Findings\n`;
        deepDive.research.forEach(r => {
            content += `- ${r.text}\n`;
            r.notes.forEach(note => content += `  > Note: ${note}\n`);
        });
        content += `\n## Key Insights\n`;
        deepDive.insights.forEach(r => {
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

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = parseInt(String(active.id).replace('item-', ''));
            const newIndex = parseInt(String(over?.id).replace('item-', ''));

            if (!isNaN(oldIndex) && !isNaN(newIndex)) {
                const newOutline = arrayMove(outline, oldIndex, newIndex);
                setOutline(newOutline);
                saveProgress({ outline: { sections: newOutline } });
            }
        }
    };

    const initializedItemIdRef = useRef<string | null>(null);

    // Restoration logic
    useEffect(() => {
        if (initializedItemIdRef.current === item.id) return;
        initializedItemIdRef.current = item.id;

        if (item.deep_dive && !deepDive) {
            setDeepDive(normalizeDeepDive(item.deep_dive));
        }
        if (item.outline && item.outline.sections && outline.length === 0) {
            setOutline(normalizeOutline(item.outline));
            setOutlineApproved(true);
        }
        if (item.draft_content && !draftContent) {
            setDraftContent(item.draft_content);
        }

        if (!deepDive && !item.deep_dive && !loading) {
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
            if (item.draft_content) setStep('generate');
            else if (item.outline) setStep('outline');
            else setStep('deep_dive');
        }
    }, [item.id, item.deep_dive, item.outline, item.draft_content, item.dev_step, deepDive, draftContent, outline.length, loading, runDeepDive]);

    const steps = [
        { key: 'deep_dive', label: 'Research' },
        { key: 'outline', label: 'Outline' },
        { key: 'generate', label: 'Draft' },
    ];
    const currentStepIndex = steps.findIndex(s => s.key === step);

    const headerItem: ContentItem = { ...item, brain_metadata: localBrainMetadata };

    return (
        <div className="fixed top-0 right-0 bottom-0 left-0 md:left-16 z-40 flex flex-col bg-white animate-in fade-in duration-200 border-l border-gray-200">
            <div className="w-full h-full flex flex-col bg-white">
                {/* Header Row */}
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

                {/* Steps Row */}
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
                        <BrainHeaderPanel
                            item={headerItem}
                            onUpdate={handleUpdateBrainMetadata}
                        />

                        {step === 'deep_dive' && (
                            loading ? (
                                <ThinkingLoader message="Analyzing context & generating insights..." />
                            ) : (
                                <DeepDiveStep
                                    deepDive={deepDive}
                                    loading={loading} // Effectively redundant here as checked above, but kept for interface
                                    refiningItems={refiningItems}
                                    onRunDeepDive={runDeepDive}
                                    onExport={handleExportResearch}
                                    onRefinePoint={handleRefinePoint}
                                    onUpdateItem={handleUpdateItem}
                                    onAddNote={(type, index, note) => {
                                        const current = deepDive![type][index];
                                        handleUpdateItem(type, index, { notes: [...current.notes, note] });
                                        handleRefinePoint(type, index, note);
                                    }}
                                    onDeleteNote={(type, index, noteIndex) => {
                                        const current = deepDive![type][index];
                                        handleUpdateItem(type, index, { notes: current.notes.filter((_, idx) => idx !== noteIndex) });
                                    }}
                                    onDelete={(type, index) => {
                                        const newData = { ...deepDive!, [type]: deepDive![type].filter((_, idx) => idx !== index) };
                                        setDeepDive(newData);
                                        saveProgress({ deep_dive: newData });
                                    }}
                                />
                            )
                        )}

                        {step === 'outline' && (
                            <OutlineStep
                                outline={outline}
                                loading={loading}
                                outlineApproved={outlineApproved}
                                sensors={sensors}
                                onAddOutlinePoint={handleAddOutlinePoint}
                                onUpdateOutlinePoint={handleUpdateOutlinePoint}
                                onDeleteOutlinePoint={handleDeleteOutlinePoint}
                                onSetOutlineApproved={setOutlineApproved}
                                onDragEnd={handleDragEnd}
                            />
                        )}

                        {step === 'generate' && (
                            <DraftStep
                                draftContent={draftContent}
                                loading={loading}
                                showContextPanel={showContextPanel}
                                verifyingStrategy={verifyingStrategy}
                                fixingStrategy={fixingStrategy}
                                strategyAnalysis={strategyAnalysis}
                                brainMetadata={localBrainMetadata}
                                outline={outline}
                                deepDive={deepDive}
                                onUpdateDraft={setDraftContent}
                                onToggleContextPanel={() => setShowContextPanel(!showContextPanel)}
                                onVerifyStrategy={handleVerifyStrategy}
                                onAutoFix={handleAutoFix}
                            />
                        )}

                        {step !== 'generate' && (
                            <RefineContextPanel
                                isOpen={showContextPanel}
                                loading={loading}
                                globalContext={globalContext}
                                onClose={() => setShowContextPanel(false)}
                                onChangeContext={setGlobalContext}
                                onUpdate={() => runDeepDive('append')}
                            />
                        )}

                    </div>
                    <LimitModal
                        isOpen={limitModalOpen}
                        onClose={() => setLimitModalOpen(false)}
                        tier={limitState.tier}
                        usage={limitState.usage}
                        limit={limitState.limit}
                    />
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center z-50 shrink-0">
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
                                <CheckCircle2 size={16} /> Complete & Save
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={loading || (step === 'outline' && !outlineApproved) || (step === 'deep_dive' && !deepDive)}
                                className="px-6 py-2 bg-[var(--foreground)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                                <ArrowRight size={16} /> Next Step
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
