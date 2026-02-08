"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { Draft, BrainMetadata } from "@/types";
import { ContextualToolbar } from "./ContextualToolbar";
import { PublishModal } from "./PublishModal";
import { RepurposeModal } from "./RepurposeModal";
import { VerificationSidebar } from "./FactCheckSidebar";
import { EditorHeader } from "./EditorHeader";
import { EditorCanvas } from "./EditorCanvas";
import { RefinementFeedback } from "./RefinementFeedback";

// Refactored Hooks & Utils
import { useVerification } from "@/hooks/editor/useVerification";
import { useEditorSelection } from "@/hooks/editor/useEditorSelection";
import { useEditorState } from "@/hooks/editor/useEditorState";
import { useAIActions } from "@/hooks/editor/useAIActions";
import { useRepurpose } from "@/hooks/editor/useRepurpose";
import { parseMarkdown, generateHighlights } from "@/lib/editor/markdown";

interface MainEditorProps {
    draft: Draft | null;
    onSave: (id: string, content: string, title?: string) => Promise<boolean>;
    onUpdateMetadata?: (id: string, metadata: BrainMetadata) => Promise<boolean>;
    onPublish?: (id: string, stage: string) => Promise<void>;
}

export function MainEditor({ draft, onSave, onPublish }: MainEditorProps) {

    // 1. Core State
    const {
        content, setContent,
        beliefText, setBeliefText,
        coverImage, setCoverImage,
        saving, saved, copied,
        handleSave, handleCopy, getFullContent
    } = useEditorState(draft, onSave);

    // 2. Mode & UI State
    const [isPreview, setIsPreview] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);

    // 3. Selection
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toolbarPosition, setToolbarPosition, selectionRange, setSelectionRange } = useEditorSelection(textareaRef);

    // 4. Verification Hook (Must be before AI Actions which relies on handleVerify)
    const {
        showFactCheck, setShowFactCheck,
        verifications,
        verifying,
        plagiarismResult,
        checkingPlagiarism,
        slopMatches, setSlopMatches,
        slopLoading,
        competitorResult,
        competitorLoading,
        historyLoading,
        handleVerify,
        handlePlagiarismCheck,
        handleSlopScan,
        handleCompetitorCheck,
        handleRunMetric,
        scores
    } = useVerification({
        draft,
        content,
        onSave,
        getFullContent
    });

    // 5. AI Actions
    const {
        learning, extracting, refining,
        lastRefinement, setLastRefinement,
        handleFinalize, handleExecuteRefinement,
        handleFactFix, handleApplySlopSuggestion
    } = useAIActions({
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
    });

    // 6. Repurpose
    const {
        showRepurposeModal, setShowRepurposeModal,
        isRepurposing, handleRepurpose, handleDownloadDesign
    } = useRepurpose({
        draft,
        content,
        coverImage,
        onSave,
        getFullContent
    });

    // 7. Feedback Loop (Detect Undo/Revert)
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        if (!lastRefinement || showFeedback) return;

        // If content matches original but NOT current refinement (i.e. User Undid)
        if (content === lastRefinement.originalContent && content !== lastRefinement.refinedContent) {
            setShowFeedback(true); // eslint-disable-line react-hooks/set-state-in-effect
        }
    }, [content, lastRefinement, showFeedback]);

    const handleFeedback = async (reason: string) => {
        if (!lastRefinement || !draft) return;

        try {
            await fetch('/api/voice/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draftId: draft.id,
                    instruction: lastRefinement.instruction,
                    reason,
                    originalText: lastRefinement.originalContent,
                    refinedText: lastRefinement.refinedContent
                })
            });
        } catch (e) {
            console.error("Failed to send feedback", e);
        }
    };

    // Constant auto-resize to prevent scrolling issues
    useEffect(() => {
        if (textareaRef.current && !isPreview) {
            // Reset to auto to correctly calculate shrink
            textareaRef.current.style.height = 'auto';
            // Set to scrollHeight to fit content
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content, isPreview]);

    if (!draft) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-8 bg-paper">
                <p className="font-serif italic text-lg opacity-50">Select a draft to start writing...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative group bg-paper">

            {/* Contextual Toolbar */}
            {toolbarPosition && (
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[60]">
                    {/* Placeholder for hierarchy, component is rendered below */}
                </div>
            )}

            {/* Document Surface */}
            <div className="flex-1 overflow-y-auto relative">
                <div className="max-w-4xl mx-auto py-8 md:py-20 px-4 md:px-16 min-h-full relative">

                    {/* Sticky Header Actions */}
                    <EditorHeader
                        draft={draft}
                        saving={saving}
                        saved={saved}
                        extracting={extracting}
                        isPreview={isPreview}
                        setIsPreview={setIsPreview}
                        handleCopy={handleCopy}
                        handleSave={handleSave}
                        setShowRepurposeModal={setShowRepurposeModal}
                        handleFinalize={handleFinalize}
                        learning={learning}
                        setShowFactCheck={setShowFactCheck}
                        handleDownloadDesign={handleDownloadDesign}
                        setShowPublishModal={setShowPublishModal}
                        copied={copied}
                    />

                    {toolbarPosition && draft.status !== 'published' && (
                        <ContextualToolbar
                            position={toolbarPosition}
                            onOptionSelect={handleExecuteRefinement}
                            onCustomInput={handleExecuteRefinement}
                            onClose={() => setToolbarPosition(null)}
                            loading={refining}
                        />
                    )}

                    {/* Cover Art Preview */}
                    {coverImage && (
                        <div className="relative mb-8 group/image">
                            <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                <Image
                                    src={coverImage}
                                    alt="Cover Art"
                                    width={1200}
                                    height={400}
                                    sizes="(max-width: 768px) 100vw, 800px"
                                    className="w-full h-auto max-h-[400px] object-cover"
                                    unoptimized
                                />
                            </div>
                            <button
                                onClick={() => setCoverImage(null)}
                                className="absolute top-4 right-4 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-500 p-2 rounded-lg opacity-0 group-hover/image:opacity-100 transition-all shadow-sm border border-gray-200"
                                title="Remove Cover Art"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Published Banner */}
                    {draft.status === 'published' && (
                        <div className="mb-8 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between group/banner animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-blue-900">This post is published</h4>
                                    <p className="text-xs text-blue-700/70">
                                        Published on {draft.published_posts?.[0]?.published_at ? new Date(draft.published_posts[0].published_at).toLocaleDateString() : new Date(draft.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="px-3 py-1.5 text-xs font-medium bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Copy Content
                                </button>
                                <button
                                    onClick={() => setShowRepurposeModal(true)}
                                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Repurpose
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Document Surface - Canvas */}
                    <EditorCanvas
                        content={content}
                        setContent={setContent}
                        beliefText={beliefText}
                        setBeliefText={setBeliefText}
                        isPreview={isPreview}
                        parseMarkdown={parseMarkdown}
                        renderHighlights={() => generateHighlights(content, selectionRange, verifications)}
                        textareaRef={textareaRef}
                        draftStatus={draft.status}
                    />

                    {showFeedback && lastRefinement && (
                        <div className="mt-8 max-w-2xl mx-auto">
                            <RefinementFeedback
                                instruction={lastRefinement.instruction}
                                onFeedback={handleFeedback}
                                onDismiss={() => {
                                    setShowFeedback(false);
                                    setLastRefinement(null);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <PublishModal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                draftId={draft.id}
                content={content}
                beliefText={draft.belief_text}
            />
            <RepurposeModal
                isOpen={showRepurposeModal}
                onClose={() => setShowRepurposeModal(false)}
                onRepurpose={handleRepurpose}
                isProcessing={isRepurposing}
                sourceContent={getFullContent()}
            />
            <VerificationSidebar
                isOpen={showFactCheck}
                onClose={() => setShowFactCheck(false)}
                factResults={verifications}
                factLoading={verifying || historyLoading}
                onFactVerify={handleVerify}
                onFixClaim={handleFactFix}
                plagiarismResult={plagiarismResult}
                plagiarismLoading={checkingPlagiarism || historyLoading}
                onPlagiarismCheck={handlePlagiarismCheck}
                slopMatches={slopMatches}
                slopLoading={slopLoading}
                onSlopScan={handleSlopScan}
                competitorResult={competitorResult}
                competitorLoading={competitorLoading}
                onCompetitorCheck={handleCompetitorCheck}
                overallScore={scores.totalScore}
                metrics={{
                    fact: scores.fact,
                    uniqueness: scores.uniqueness,
                    style: scores.style
                }}
                onRunAll={() => handleRunMetric('run-all')}
                onApplySlopSuggestion={(match) => handleApplySlopSuggestion(match, setSlopMatches)}
            />
        </div>
    );
}
