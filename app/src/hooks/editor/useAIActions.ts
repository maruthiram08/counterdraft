
import { useState } from "react";
import { toast } from "sonner";
import type { Draft } from "@/types";
import { AntiSlopService, SlopMatch } from "@/lib/tools/anti-slop";

interface UseAIActionsProps {
    draft: Draft | null;
    content: string;
    setContent: (c: string) => void;
    getFullContent: () => string;
    onSave: (id: string, content: string) => Promise<boolean>;
    onPublish?: (id: string, stage: string) => Promise<void>;
    handleVerify?: () => void;
    setToolbarPosition?: (pos: { top: number; left: number } | null) => void;
    setSelectionRange?: (range: { start: number; end: number } | null) => void;
    selectionRange?: { start: number; end: number } | null;
}

export function useAIActions({
    draft,
    content,
    setContent,
    getFullContent,
    onSave,
    onPublish,
    handleVerify,
    setToolbarPosition,
    setSelectionRange,
    selectionRange
}: UseAIActionsProps) {
    const [learning, setLearning] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [refining, setRefining] = useState(false);
    const [lastRefinement, setLastRefinement] = useState<{
        originalContent: string;
        refinedContent: string;
        instruction: string;
        timestamp: number;
    } | null>(null);

    const handleExtractKnowledge = async (text: string) => {
        if (!draft || text.length < 200) return;
        setExtracting(true);
        try {
            const res = await fetch('/api/knowledge/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    contentId: draft.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.analysis && (data.analysis.beliefs > 0 || data.analysis.tensions > 0)) {
                    console.log(`[Knowledge] Extracted ${data.analysis.beliefs} beliefs, ${data.analysis.tensions} tensions.`);
                }
            }
        } catch (e) {
            console.error("Extraction failed", e);
        } finally {
            setExtracting(false);
        }
    };

    const handleFinalize = async () => {
        if (!draft) return;
        setLearning(true);
        const toastId = toast.loading("Finalizing and updating Voice Profile...");

        try {
            await onSave(draft.id, getFullContent());

            const learnRes = await fetch('/api/voice/learn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draftId: draft.id,
                    finalContent: getFullContent()
                })
            });

            if (learnRes.ok) {
                const data = await learnRes.json();
                if (data.learned) {
                    toast.success("Voice Profile Updated!", { id: toastId, description: `Added ${data.newRulesCount} new rules based on your edits.` });
                } else {
                    toast.success("Analysis Complete", { id: toastId, description: "No significant style deviations found." });
                }

                // 1. Update backend state (this is the source of truth)
                const publishRes = await fetch('/api/content', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: draft.id,
                        stage: 'published',
                        status: 'published', // Explicitly set status to published
                        published_at: new Date().toISOString()
                    })
                });

                if (!publishRes.ok) {
                    throw new Error("Failed to update status to published");
                }

                // 2. Update parent state if callback provided
                if (onPublish) {
                    await onPublish(draft.id, 'published');
                } else {
                    // Fallback: direct update if no parent handler
                    await fetch(`/api/drafts/${draft.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'published' })
                    });
                }

                toast.success("Draft moved to Published", { duration: 3000 });
                // Force a small delay to allow UI to react before any navigation
                await new Promise(r => setTimeout(r, 500));
            } else {
                toast.error("Failed to update voice profile.", { id: toastId });
            }
        } catch (e) {
            console.error("Learning failed", e);
            toast.error("Network error.", { id: toastId });
        } finally {
            setLearning(false);
        }
    };

    const handleExecuteRefinement = async (instruction: string) => {
        if (!draft || !selectionRange) return;

        setRefining(true);
        try {
            const selectedText = content.substring(selectionRange.start, selectionRange.end);
            const contextBefore = content.substring(Math.max(0, selectionRange.start - 100), selectionRange.start);
            const contextAfter = content.substring(selectionRange.end, Math.min(content.length, selectionRange.end + 100));

            const response = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentContent: content,
                    selection: selectedText,
                    instruction,
                    context: { before: contextBefore, after: contextAfter },
                    beliefContext: draft.belief_text
                })
            });

            if (response.ok) {
                const data = await response.json();
                const newContent = content.substring(0, selectionRange.start)
                    + data.refinedContent
                    + content.substring(selectionRange.end);

                setLastRefinement({
                    originalContent: content,
                    refinedContent: newContent,
                    instruction,
                    timestamp: Date.now()
                });

                setContent(newContent);
                if (setToolbarPosition) setToolbarPosition(null);
                if (setSelectionRange) setSelectionRange(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setRefining(false);
        }
    };

    const handleFactFix = async (claim: string, analysis: string, sourceSnippet?: string, status?: string) => {
        if (!draft) return;
        setRefining(true);
        const toastId = toast.loading("Applying surgical fix...");

        let instruction = "";
        if (status === 'unverified' || status === 'irrelevant') {
            instruction = `The claim "${claim}" could not be verified by sources (Status: ${status}). Review the analysis: "${analysis}". If this claim is central to the argument, rewrite it to be more precise/hypothetical. If it is unsupported fluff, DELETE it completely.`;
        } else {
            instruction = `The claim "${claim}" is factually DISPUTED. Correct it immediately using this verified evidence: "${analysis}". ${sourceSnippet ? `Source context: ${sourceSnippet}` : ''} Keep the rest of the text unchanged.`;
        }

        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'auto_fix_strategy',
                    draft: content,
                    fix_instruction: instruction,
                    brainMetadata: { outcome: 'Accuracy', audience: { role: 'General Reader' } }
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.draft) {
                    setContent(data.draft);
                    toast.success("Fix applied!", { id: toastId });
                    if (handleVerify) handleVerify();
                } else {
                    toast.error("Fixed failed to generate.", { id: toastId });
                }
            } else {
                toast.error("Server error during fix.", { id: toastId });
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error.", { id: toastId });
        } finally {
            setRefining(false);
        }
    };

    // Helper for Slop Suggestions (local logic)
    const handleApplySlopSuggestion = (match: { startIndex: number; endIndex: number; word: string; suggestion: string }, setSlopMatches: (m: SlopMatch[]) => void) => {
        const currentText = content;
        const target = currentText.substring(match.startIndex, match.endIndex);

        if (target !== match.word) {
            // console.warn("Text mismatch");
            return;
        }

        const pre = currentText.substring(0, match.startIndex);
        const post = currentText.substring(match.endIndex);
        const newContent = pre + match.suggestion + post;

        setContent(newContent);
        const newMatches = AntiSlopService.scan(newContent);
        setSlopMatches(newMatches);
    };

    return {
        learning,
        extracting,
        refining,
        lastRefinement,
        setLastRefinement,
        handleExtractKnowledge,
        handleFinalize,
        handleExecuteRefinement,
        handleFactFix,
        handleApplySlopSuggestion
    };
}
