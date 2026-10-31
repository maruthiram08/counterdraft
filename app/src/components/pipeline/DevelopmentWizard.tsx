"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, X, ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { CircleCheckIcon, RefreshCWIcon } from "@/components/icons/animated";
import { toast } from "sonner";
import { BrainHeaderPanel } from "./BrainHeaderPanel";
import { BrainMetadata } from "@/types";
import { formatStrategyContext } from "@/lib/brain/strategy";
import { LimitModal } from "../modal/LimitModal";

import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import { DeepDiveData, ResearchPoint, ContentItem, WizardStep } from "./wizard/types";
import { DeepDiveStep } from "./wizard/DeepDiveStep";
import { OutlineStep } from "./wizard/OutlineStep";
import { DraftStep } from "./wizard/DraftStep";
import { RefineContextPanel } from "./wizard/RefineContextPanel";
import { ThinkingLoader } from "./wizard/ThinkingLoader";
import { StrategyAnalysis, toStrategyAnalysis } from "@/lib/brain/strategy";
import { mergeNotes } from "@/lib/editor/draft-tools";
import type { DraftAnswer, DraftQuestion, OutlineShapeOption } from "@/lib/editor/draft-tools";
import { liveSuggestions, wrapSuggestions } from "@/lib/editor/suggestions";
import { DraftQuestionsStep } from "./wizard/DraftQuestionsStep";
import { OriginalityCheck } from "./wizard/OriginalityCheck";
import { CaptureSourcesStrip } from "./wizard/CaptureSourcesStrip";
import { reframeModeLabel } from "@/lib/brain/reframe";
import { Spinner } from "@/components/shared/Loading";

// Set when the writer ticks "Don't ask me before drafting"
const SKIP_QUESTIONS_KEY = 'cd-skip-draft-questions';
const readSkipQuestions = () => {
    try { return localStorage.getItem(SKIP_QUESTIONS_KEY) === '1'; } catch { return false; }
};

interface DevelopmentWizardProps {
    item: ContentItem;
    onClose: () => void;
    // Resolves true once the draft is saved; false when it was not (error, limit reached)
    onComplete: (draftContent: string) => Promise<boolean>;
}

type DeepDiveListItem = string | ResearchPoint | { text: string; notes?: string[] };
type DeepDivePayload = { research?: DeepDiveListItem[]; insights?: DeepDiveListItem[] };
type OutlineSection = string | ResearchPoint | { text: string; notes?: string[] };

export function DevelopmentWizard({ item, onClose, onComplete }: DevelopmentWizardProps) {
    const [step, setStep] = useState<WizardStep>('deep_dive');
    const [loading, setLoading] = useState(false);
    const [completing, setCompleting] = useState(false);

    // Deep Dive state - Now using rich objects
    const [deepDive, setDeepDive] = useState<DeepDiveData | null>(null);
    // Latest deep dive for async callbacks (parallel refinements must not overwrite each other)
    const latestDeepDive = useRef<DeepDiveData | null>(null);
    useEffect(() => {
        latestDeepDive.current = deepDive;
    }, [deepDive]);

    // Outline state - Now using rich objects
    const [outline, setOutline] = useState<ResearchPoint[]>([]);
    const [outlineApproved, setOutlineApproved] = useState(false);
    const [outlineShapes, setOutlineShapes] = useState<OutlineShapeOption[] | null>(null);
    const [findingShapes, setFindingShapes] = useState(false);
    // Questions before drafting: shown between an approved outline and the draft
    const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[] | null>(null);
    const [draftAnswers, setDraftAnswers] = useState<string[]>([]);
    const [askingQuestions, setAskingQuestions] = useState(false);
    const [skipQuestions, setSkipQuestions] = useState(false);

    // Draft state
    const [draftContent, setDraftContent] = useState('');
    const [draftError, setDraftError] = useState<string | null>(null);
    const [workingInNotes, setWorkingInNotes] = useState(false);

    // Strategy Verification State
    const [strategyAnalysis, setStrategyAnalysis] = useState<StrategyAnalysis | null>(null);
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

    // A reframe drafts straight from the captured post until the writer adds research
    const reframe = localBrainMetadata?.reframe;
    const quickReframe = !!reframe?.original && !deepDive && outline.length === 0;
    const reframeDomain = localBrainMetadata?.explore?.sources?.find(s => s.captureId === reframe?.captureId)?.source;
    // The Lens captures this post is built from, shown so the writer can check or drop one
    const captureSourceList = (localBrainMetadata?.explore?.sources || []).filter(s => !!s.captureId);
    const removeCaptureSource = (captureId: string) => {
        const explore = latestBrainMetadata.current?.explore;
        if (!explore) return;
        updateMetadata({ explore: { ...explore, sources: explore.sources.filter(s => s.captureId !== captureId) } });
        toast.success("Removed. Steps you run from now on won't use it.");
    };
    // Set when a new reframe opens, so its first draft starts without a click
    const [autoStartReframe, setAutoStartReframe] = useState(false);

    // Returns the new analysis so a caller can compare it with the last one
    const handleVerifyStrategy = async (contentOverride?: string, fix?: string): Promise<StrategyAnalysis | null> => {
        // Buttons can call this with a click event; only a string is a draft
        const textToVerify = typeof contentOverride === 'string' && contentOverride.trim() ? contentOverride : draftContent;
        if (!textToVerify) return null;
        // The last check anchors the re-check, so ratings only move where the draft changed
        const previous = strategyAnalysis?.criteria.length
            ? { criteria: strategyAnalysis.criteria.map(c => ({ key: c.key, rating: c.rating, note: c.note })), fix }
            : undefined;

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
                    brainMetadata: latestBrainMetadata.current,
                    previous
                })
            });

            const data = await res.json();
            if (res.ok) {
                const analysis = toStrategyAnalysis(data);
                setStrategyAnalysis(analysis);
                if (!fix) toast.success('Strategy analysis complete');
                return analysis;
            }
            toast.error(data.error || 'Failed to verify strategy');
        } catch (error) {
            console.error("Strategy verification failed:", error);
            toast.error('Verification failed');
        } finally {
            setVerifyingStrategy(false);
        }
        return null;
    };

    const [fixingStrategy, setFixingStrategy] = useState(false);

    const handleAutoFix = async (instruction: string) => {
        if (!draftContent) return;
        const before = { draft: draftContent, analysis: strategyAnalysis };
        setFixingStrategy(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'auto_fix_strategy',
                    draft: draftContent,
                    fix_instruction: instruction,
                    brainMetadata: latestBrainMetadata.current
                })
            });

            const data = await res.json();
            if (res.ok && data.draft) {
                setDraftContent(data.draft);
                // Re-check the new draft against the last check, and keep whichever version scores higher
                const after = await handleVerifyStrategy(data.draft, instruction);
                if (after && before.analysis && after.score < before.analysis.score) {
                    setDraftContent(before.draft);
                    setStrategyAnalysis(before.analysis);
                    toast.info(`That fix scored ${after.score}, lower than ${before.analysis.score}, so your previous draft is kept`);
                } else if (after) {
                    toast.success(before.analysis ? `Fix applied: ${before.analysis.score} → ${after.score}` : 'Fix applied');
                }
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

    // Latest strategy for async callbacks, so a finished research run never overwrites edits made while it ran
    const latestBrainMetadata = useRef(localBrainMetadata);
    useEffect(() => {
        latestBrainMetadata.current = localBrainMetadata;
    }, [localBrainMetadata]);
    const researchStrategy = formatStrategyContext(localBrainMetadata);
    const strategyChangedSinceResearch = !!deepDive && !!researchStrategy
        && (localBrainMetadata?.researchedWith ?? '') !== researchStrategy;
    // Outlines and drafts made before these snapshots existed have none, so they never show as stale
    const outlinedWith = localBrainMetadata?.outlinedWith;
    const strategyChangedSinceOutline = outline.length > 0 && outlinedWith !== undefined && outlinedWith !== researchStrategy;
    const draftedWith = localBrainMetadata?.draftedWith;
    const strategyChangedSinceDraft = !!draftContent && draftedWith !== undefined && draftedWith !== researchStrategy;

    // Saves which strategy a step was generated from, on top of the latest metadata
    const markGeneratedWith = (key: 'outlinedWith' | 'draftedWith', snapshot: string, extra: Partial<ContentItem> = {}) => {
        const brainMetadata = { ...latestBrainMetadata.current, [key]: snapshot } as BrainMetadata;
        latestBrainMetadata.current = brainMetadata;
        setLocalBrainMetadata(brainMetadata);
        saveProgress({ ...extra, brain_metadata: brainMetadata });
    };

    // Notes and suggested passages live in the metadata, so a later rebuild or rewrite still has them
    const updateMetadata = (patch: Partial<BrainMetadata>) => {
        const brainMetadata = { ...latestBrainMetadata.current, ...patch } as BrainMetadata;
        latestBrainMetadata.current = brainMetadata;
        setLocalBrainMetadata(brainMetadata);
        saveProgress({ brain_metadata: brainMetadata });
    };

    const [refiningItems, setRefiningItems] = useState<{ type: 'research' | 'insights', index: number }[]>([]);

    const handleUpdateBrainMetadata = (metadata: BrainMetadata) => {
        // Update the ref now so research started right after a strategy change uses it
        latestBrainMetadata.current = metadata;
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

    // 'refresh' regenerates like 'reset' but without the confirm, for strategy-driven reruns
    const runDeepDive = useCallback(async (mode: 'initial' | 'reset' | 'refresh' | 'append' = 'initial') => {
        if (mode === 'reset') {
            if (!confirm("This will clear current findings and regenerate from scratch. Continue?")) return;
        }

        setLoading(true);
        saveProgress({ dev_step: 'deep_dive_in_progress' });
        const brainMetadataForRun = latestBrainMetadata.current;
        const researchedWith = formatStrategyContext(brainMetadataForRun);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deep_dive',
                    hook: item.hook,
                    angle: item.angle,
                    references: brainMetadataForRun?.references || [],
                    userContext: globalContext,
                    brainMetadata: brainMetadataForRun
                }),
            });
            if (!res.ok) {
                // A timeout or gateway error comes back as a page, not JSON
                const errData = await res.json().catch(() => ({}));
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
            if (data.deep_dive?.webSources === 0) {
                toast.warning("Web search returned nothing, so this research comes from the AI's own knowledge and has no live sources.");
            }

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
                    if (mode === 'reset' || mode === 'refresh') setGlobalContext("");
                    const brainMetadata = { ...latestBrainMetadata.current, researchedWith } as BrainMetadata;
                    setLocalBrainMetadata(brainMetadata);
                    saveProgress({
                        deep_dive: richData,
                        dev_step: 'deep_dive_complete',
                        brain_metadata: brainMetadata
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
    }, [deepDive, globalContext, item.angle, item.hook, saveProgress]);

    // Shaping the strategy reruns research so it follows the brief, unless the user has
    // already annotated findings (then the stale-strategy banner lets them choose)
    const handleStrategyShaped = () => {
        if (loading) return;
        // On the outline step an untouched outline is rebuilt for the new strategy
        if (step === 'outline') {
            if (!outline.some(s => s.notes?.length)) generateOutline();
            return;
        }
        if (step !== 'deep_dive') return;
        const hasNotes = !!deepDive && [...deepDive.research, ...deepDive.insights].some(p => p.notes?.length);
        if (hasNotes) return;
        runDeepDive(deepDive ? 'refresh' : 'initial');
    };


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
        const brainMetadataForRun = latestBrainMetadata.current;
        const outlinedWith = formatStrategyContext(brainMetadataForRun);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'outline',
                    hook: item.hook,
                    angle: item.angle,
                    deep_dive: deepDive,
                    brainMetadata: brainMetadataForRun,
                    userContext: globalContext,
                    references: brainMetadataForRun?.references || [],
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
            // A new outline needs a fresh look before it drives the draft
            setOutlineApproved(false);
            markGeneratedWith('outlinedWith', outlinedWith, {
                outline: { sections: normalizedSections },
                dev_step: 'outline_review'
            });
        } catch (err) {
            console.error('Outline generation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    // Two other ways to build the same post, to compare before drafting
    const findOutlineShapes = async () => {
        setFindingShapes(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'outline_shapes',
                    hook: item.hook,
                    angle: item.angle,
                    deep_dive: deepDive,
                    brainMetadata: latestBrainMetadata.current,
                    outline,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not find other shapes');
            if (!data.shapes?.length) throw new Error('No other shapes came back. Try again.');
            setOutlineShapes(data.shapes);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not find other shapes');
        } finally {
            setFindingShapes(false);
        }
    };

    const applyOutlineShape = (shape: OutlineShapeOption) => {
        const sections = shape.sections.map(text => ({ text, notes: [] }));
        setOutline(sections);
        setOutlineApproved(false);
        setOutlineShapes(null);
        saveProgress({ outline: { sections } });
    };

    const generateDraft = async (answers: DraftAnswer[] = []) => {
        setLoading(true);
        setDraftError(null);
        saveProgress({ dev_step: 'draft_in_progress' });
        // Today's answers join the notes from earlier runs, so nothing the writer told us is lost on a redraft
        const notes = mergeNotes(latestBrainMetadata.current?.draftNotes, answers);
        if (answers.length) updateMetadata({ draftNotes: notes });
        const brainMetadataForRun = latestBrainMetadata.current;
        const draftedWith = formatStrategyContext(brainMetadataForRun);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'draft',
                    hook: item.hook,
                    angle: item.angle,
                    outline: outline,
                    deep_dive: deepDive,
                    brainMetadata: brainMetadataForRun,
                    userContext: globalContext,
                    references: brainMetadataForRun?.references || [],
                    answers: notes,
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
                throw new Error(res.status === 504 ? 'Writing took too long and was cut off.' : errData.error || `Server error ${res.status}.`);
            }

            const data = await res.json();
            if (!data.draft?.trim()) throw new Error('The writer came back empty.');
            setDraftContent(data.draft);
            updateMetadata({ draftedWith, draftSuggestions: Array.isArray(data.suggestions) ? data.suggestions : [] });
        } catch (err) {
            console.error('Draft generation failed:', err);
            // Offline, a dropped connection, or a phone that put the page to sleep mid-request all land here
            const reason = err instanceof Error && err.message && err.message !== 'Failed to fetch' && err.message !== 'Load failed'
                ? err.message
                : 'The connection dropped before it finished.';
            setDraftError(reason);
            toast.error("Couldn't write the draft. Tap Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (draftQuestions) {
            writeDraft(draftQuestions.map((q, i) => ({ question: q.question, answer: draftAnswers[i] || '' })).filter(a => a.answer.trim()));
        } else if (step === 'deep_dive' && deepDive) {
            setStep('outline');
            generateOutline();
        } else if (step === 'outline' && outlineApproved) {
            whenAllowed(setAskingQuestions, () => {
                if (readSkipQuestions()) {
                    setAskingQuestions(false);
                    writeDraft();
                    return;
                }
                askBeforeDrafting();
            });
        }
    };

    // The limit check is a round trip, so the busy state goes up first: the tap shows at once, not after the check
    const whenAllowed = (setBusy: (busy: boolean) => void, run: () => void) => {
        setBusy(true);
        checkLimit().then(allowed => {
            if (allowed) run();
            else setBusy(false);
        });
    };

    const writeDraft = (answers: DraftAnswer[] = []) => {
        if (skipQuestions) {
            try { localStorage.setItem(SKIP_QUESTIONS_KEY, '1'); } catch { /* private mode */ }
        }
        setDraftQuestions(null);
        setStep('generate');
        generateDraft(answers);
    };

    // Two or three questions only the writer can answer; if none come back, draft straight away
    const askBeforeDrafting = async () => {
        setAskingQuestions(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'draft_questions',
                    hook: item.hook,
                    angle: item.angle,
                    outline,
                    brainMetadata: latestBrainMetadata.current,
                }),
            });
            const data = res.ok ? await res.json() : null;
            if (!data?.questions?.length) {
                writeDraft();
                return;
            }
            // A question asked before keeps the answer given then
            const notes = latestBrainMetadata.current?.draftNotes || [];
            setDraftAnswers(data.questions.map((q: DraftQuestion) => notes.find(n => n.question === q.question)?.answer || ''));
            setDraftQuestions(data.questions);
        } catch {
            writeDraft();
        } finally {
            setAskingQuestions(false);
        }
    };

    // Reframe: the pre-draft questions, then the draft. Answers already given skip the questions.
    const startReframe = () => {
        whenAllowed(setAskingQuestions, () => {
            if (readSkipQuestions() || latestBrainMetadata.current?.draftNotes?.length) {
                setAskingQuestions(false);
                writeDraft();
                return;
            }
            askBeforeDrafting();
        });
    };

    useEffect(() => {
        if (!autoStartReframe) return;
        setAutoStartReframe(false);
        startReframe();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when a new reframe opens
    }, [autoStartReframe]);

    // Work the saved notes into the draft as it stands now, and fill any gaps with suggestions
    const workInNotes = async (notes: DraftAnswer[]) => {
        setWorkingInNotes(true);
        try {
            const current = latestBrainMetadata.current;
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'use_notes',
                    draft: wrapSuggestions(draftContent, current?.draftSuggestions || []),
                    notes,
                    outline,
                    deep_dive: deepDive,
                    brainMetadata: current,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.draft) throw new Error(data.error || 'Could not work your notes in');
            setDraftContent(data.draft);
            updateMetadata({ draftNotes: notes, draftSuggestions: Array.isArray(data.suggestions) ? data.suggestions : [] });
            toast.success(notes.length ? 'Your notes are in the draft' : 'Filled in. Check the highlighted spots.');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not work your notes in');
        } finally {
            setWorkingInNotes(false);
        }
    };

    const handleBack = () => {
        if (draftQuestions) setDraftQuestions(null);
        else if (step === 'deep_dive' && quickReframe) setStep('generate');
        else if (step === 'outline') setStep('deep_dive');
        else if (step === 'generate') setStep('outline');
    };

    const handleComplete = async () => {
        if (!draftContent || completing) return;
        setCompleting(true);
        try {
            const saved = await onComplete(draftContent);
            // On success the parent closes the wizard; otherwise let the user try again
            if (!saved) setCompleting(false);
        } catch (e) {
            console.error("Failed to complete draft", e);
            toast.error("Couldn't save your draft. Please try again.");
            setCompleting(false);
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
        const base = latestDeepDive.current;
        if (!base) return;
        const newList = [...base[type]];
        newList[index] = { ...newList[index], ...updates };
        const newData = { ...base, [type]: newList };
        latestDeepDive.current = newData;
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

        // Research waits for the user to start it, so the strategy brief can shape it
        if (item.dev_step) {
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
            else if (latestBrainMetadata.current?.reframe?.original) {
                setStep('generate');
                setAutoStartReframe(true);
            }
            else setStep('deep_dive');
        }
    }, [item.id, item.deep_dive, item.outline, item.draft_content, item.dev_step, deepDive, draftContent, outline.length]);

    const steps = [
        { key: 'deep_dive', label: 'Research' },
        { key: 'outline', label: 'Outline' },
        { key: 'generate', label: 'Draft' },
    ];
    const currentStepIndex = steps.findIndex(s => s.key === step);
    const canGoBack = !!draftQuestions || (step === 'deep_dive' ? quickReframe : step === 'outline' || !quickReframe);

    const headerItem: ContentItem = { ...item, brain_metadata: localBrainMetadata };

    return (
        <div className="fixed top-0 right-0 bottom-0 left-0 md:left-16 z-40 flex flex-col bg-canvas shadow-float animate-in fade-in duration-200">
            <div className="relative w-full h-full flex flex-col bg-canvas">
                {/* Header Row */}
                <div className="px-4 md:px-8 py-3 md:py-0 md:h-20 flex items-center justify-between gap-3 bg-canvas shrink-0 z-50">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <h2 className="text-lg leading-snug md:text-2xl md:leading-normal font-medium tracking-[-0.02em] text-ink line-clamp-2 md:line-clamp-1" title={item.hook}>
                            {item.hook}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            disabled={completing}
                            onClick={() => {
                                saveProgress({ dev_step: step === 'deep_dive' ? 'deep_dive_in_progress' : step === 'outline' ? 'outline_in_progress' : 'draft_in_progress' });
                                onClose();
                            }}
                            className="flex items-center gap-2 h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                        >
                            <span className="md:hidden">Save</span><span className="hidden md:inline">Save & Exit</span> <X size={14} className="text-ember-500" />
                        </button>
                    </div>
                </div>

                {/* Steps Row: a reframe skips research and outline unless the writer adds them */}
                {quickReframe && step === 'generate' && reframe ? (
                    <div className="px-4 md:px-8 pb-3 md:pb-4 bg-canvas shrink-0 flex flex-wrap items-center justify-center gap-2 z-40">
                        <span className="h-9 md:h-10 px-4 rounded-full bg-canvas shadow-pressed text-[13px] md:text-sm font-medium text-ember-600 flex items-center whitespace-nowrap">
                            Reframe · {reframeModeLabel(reframe.mode)}
                        </span>
                        <button
                            onClick={() => setStep('deep_dive')}
                            disabled={loading || askingQuestions || completing}
                            className="h-11 md:h-10 px-4 rounded-full bg-canvas shadow-raised text-[13px] md:text-sm font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                        >
                            Add research
                        </button>
                    </div>
                ) : (
                <div className="px-4 md:px-8 pb-3 md:pb-4 bg-canvas shrink-0 flex justify-center z-40">
                    <div className="flex items-center md:gap-3">
                        {steps.map((s, i) => {
                            const isActive = s.key === step;
                            const isPast = i < currentStepIndex;
                            return (
                                <div key={s.key} className="flex items-center">
                                    <div
                                        className={`h-9 md:h-10 px-3 md:px-4 rounded-full bg-canvas text-[13px] md:text-sm font-medium transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${isActive
                                            ? 'shadow-pressed text-ember-600'
                                            : isPast
                                                ? 'shadow-raised text-sage-700'
                                                : 'shadow-raised text-ink-muted'
                                            }`}
                                    >
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${isActive ? 'bg-ember-500 text-white' : isPast ? 'bg-sage-100 text-sage-700' : 'bg-canvas shadow-well'
                                            }`}>
                                            {isPast ? <Check size={10} strokeWidth={3} /> : i + 1}
                                        </span>
                                        <span>{s.label}</span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className={`w-3 md:w-12 h-0.5 rounded-full mx-1 md:mx-2 ${isPast ? 'bg-sage-500/40' : 'bg-line'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-canvas">
                    <div className="w-full max-w-[1600px] mx-auto px-4 pt-4 pb-8 md:px-8 md:pt-6 md:pb-24 min-h-full flex flex-col">
                        <BrainHeaderPanel
                            item={headerItem}
                            onUpdate={handleUpdateBrainMetadata}
                            onStrategyShaped={handleStrategyShaped}
                            collapsed={step === 'generate' && !!draftContent}
                        />

                        {captureSourceList.length > 0 && (
                            <CaptureSourcesStrip
                                sources={captureSourceList}
                                lockedId={reframe?.captureId}
                                disabled={loading || askingQuestions || completing}
                                onRemove={removeCaptureSource}
                            />
                        )}

                        {step === 'deep_dive' && (
                            loading ? (
                                <ThinkingLoader message="Analyzing context & generating insights..." />
                            ) : (
                                <DeepDiveStep
                                    deepDive={deepDive}
                                    loading={loading} // Effectively redundant here as checked above, but kept for interface
                                    refiningItems={refiningItems}
                                    onRunDeepDive={runDeepDive}
                                    strategyChanged={strategyChangedSinceResearch}
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

                        {step === 'generate' && askingQuestions && !draftContent && (
                            <ThinkingLoader message="Reading the post..." />
                        )}

                        {(step === 'outline' || step === 'generate') && draftQuestions && (
                            <DraftQuestionsStep
                                questions={draftQuestions}
                                answers={draftAnswers}
                                onChange={(i, a) => setDraftAnswers(prev => { const next = [...prev]; next[i] = a; return next; })}
                                dontAsk={skipQuestions}
                                onDontAskChange={setSkipQuestions}
                                onSkip={() => writeDraft()}
                            />
                        )}

                        {step === 'outline' && !draftQuestions && (
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
                                strategyChanged={strategyChangedSinceOutline}
                                onRebuild={generateOutline}
                                shapes={outlineShapes}
                                findingShapes={findingShapes}
                                onFindShapes={findOutlineShapes}
                                onUseShape={applyOutlineShape}
                            />
                        )}

                        {step === 'generate' && !draftQuestions && !(askingQuestions && !draftContent) && (
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
                                readOnly={completing}
                                onUpdateDraft={setDraftContent}
                                onToggleContextPanel={() => setShowContextPanel(!showContextPanel)}
                                onVerifyStrategy={handleVerifyStrategy}
                                onAutoFix={handleAutoFix}
                                strategyChanged={strategyChangedSinceDraft}
                                notes={localBrainMetadata?.draftNotes || []}
                                onNotesChange={(draftNotes) => updateMetadata({ draftNotes })}
                                onWorkInNotes={workInNotes}
                                workingInNotes={workingInNotes}
                                suggestions={localBrainMetadata?.draftSuggestions || []}
                                onKeepSuggestion={(text) => updateMetadata({ draftSuggestions: liveSuggestions(draftContent, localBrainMetadata?.draftSuggestions).filter(s => s !== text) })}
                                draftError={draftError}
                                onWriteDraft={quickReframe ? startReframe : () => whenAllowed(setLoading, () => generateDraft())}
                                onRebuild={() => {
                                    // A reframe has no outline: redraft from the post with the new strategy
                                    if (quickReframe) {
                                        whenAllowed(setLoading, () => generateDraft());
                                        return;
                                    }
                                    // The draft follows the outline, so a new strategy starts from a new outline
                                    setStep('outline');
                                    generateOutline();
                                }}
                            />
                        )}

                        {step === 'generate' && reframe?.original && draftContent && !loading && !draftQuestions && (
                            <OriginalityCheck
                                draft={draftContent}
                                reframe={reframe}
                                domain={reframeDomain}
                                onAddCredit={line => setDraftContent(`${draftContent.trimEnd()}\n\n${line}`)}
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

                {/* Phones: a footer bar, so the buttons never cover the text. Desktop: floating, so the content keeps the full height */}
                <div className="shrink-0 z-50 flex justify-between items-center gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-canvas border-t border-line md:border-0 md:bg-transparent md:p-0 md:pointer-events-none md:absolute md:bottom-6 md:left-8 md:right-8 md:items-end">
                    <div className="pointer-events-auto">
                        {canGoBack && (
                            <button
                                onClick={handleBack}
                                disabled={loading || completing}
                                className="h-11 md:h-10 px-4 rounded-full bg-canvas text-ink-soft text-sm font-medium shadow-raised md:shadow-float hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <ArrowLeft size={14} className="text-ember-500" /> Back
                            </button>
                        )}
                    </div>

                    <div className="pointer-events-auto flex gap-3">
                        {step === 'deep_dive' && (
                            <button
                                onClick={() => {
                                    setShowContextPanel(true);
                                    document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={loading || !deepDive}
                                className="h-11 md:h-12 px-4 md:px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised md:shadow-float hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <AnimatedIcon icon={RefreshCWIcon} size={14} className="text-ember-500" /> <span>Refine<span className="hidden md:inline"> Research</span></span>
                            </button>
                        )}

                        {step === 'generate' && !draftQuestions ? (
                            <button
                                onClick={handleComplete}
                                disabled={!draftContent || loading || completing}
                                aria-busy={completing}
                                className="h-11 md:h-12 px-4 md:px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
                            >
                                {completing ? (
                                    <><Spinner size={16} /> Saving your draft...</>
                                ) : (
                                    <><AnimatedIcon icon={CircleCheckIcon} size={16} /> Complete & Save</>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={loading || askingQuestions || (step === 'outline' && !outlineApproved) || (step === 'deep_dive' && !deepDive)}
                                className="h-11 md:h-12 px-4 md:px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {askingQuestions
                                    ? <><Spinner size={16} /> One moment...</>
                                    : draftQuestions
                                        ? <><ArrowRight size={16} /> Write the draft</>
                                        : <><ArrowRight size={16} /> Next Step</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
