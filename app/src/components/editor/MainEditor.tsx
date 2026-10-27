"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { SparklesIcon } from "@/components/icons/animated";
import type { Draft, BrainMetadata } from "@/types";
import { ContextualToolbar } from "./ContextualToolbar";
import { PublishModal } from "./PublishModal";
import { RepurposeModal } from "./RepurposeModal";
import { VerificationSidebar } from "./FactCheckSidebar";
import { EditorHeader } from "./EditorHeader";
import { EditorCanvas } from "./EditorCanvas";
import { RefinementFeedback } from "./RefinementFeedback";
import { HookLab } from "./HookLab";
import { LinkedInPreview } from "./LinkedInPreview";
import { PlaceholderNotice } from "./PlaceholderNotice";
import { VariantsPanel } from "./VariantsPanel";
import { CraftScorePanel } from "./CraftScorePanel";
import { postPlatforms } from "./PublishedPostsList";
import { findPlaceholders, Placeholder } from "@/lib/editor/placeholders";

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
    onDuplicate?: (draft: Draft) => Promise<void>;
}

export function MainEditor({ draft, onSave, onPublish, onDuplicate }: MainEditorProps) {
    const [duplicating, setDuplicating] = useState(false);

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
    const [postTool, setPostTool] = useState<'craft' | 'openings' | 'variants' | 'preview' | null>(null);

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

    // Spots the draft left for the writer, and taking them to one: scroll it into view and select it
    const placeholders = findPlaceholders(content);
    const jumpToPlaceholder = (p: Placeholder) => {
        if (isPreview) setIsPreview(false);
        requestAnimationFrame(() => {
            const area = textareaRef.current;
            if (!area) return;
            area.parentElement?.querySelector<HTMLElement>(`[data-placeholder="${p.index}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            area.focus({ preventScroll: true });
            area.setSelectionRange(p.start, p.end);
        });
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
            <div className="h-full flex flex-col items-center justify-center text-ink-muted p-8 bg-canvas">
                <p className="text-base">Select a draft to start writing...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative group bg-canvas">

            {/* Contextual Toolbar */}
            {toolbarPosition && (
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[60]">
                    {/* Placeholder for hierarchy, component is rendered below */}
                </div>
            )}

            {/* Document Surface */}
            <div className="flex-1 overflow-y-auto relative">
                {/* Phones: bottom room to clear the nav and the AI Agent pill */}
                <div className="max-w-4xl mx-auto pt-2 pb-40 md:pt-8 md:pb-12 px-4 md:px-10 min-h-full relative">

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
                            <div className="rounded-tile overflow-hidden shadow-card">
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
                                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-rose-700 active:shadow-pressed [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/image:opacity-100 transition-all"
                                title="Remove Cover Art"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Published Banner */}
                    {draft.status === 'published' && (
                        <div className="mb-6 p-4 bg-dusk-100 rounded-tile shadow-raised flex flex-wrap gap-3 items-center justify-between group/banner animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface text-dusk-700">
                                    <AnimatedIcon icon={SparklesIcon} size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-ink">This post is published</h4>
                                    <p className="text-xs text-ink-soft">
                                        Published on {draft.published_posts?.[0]?.published_at ? new Date(draft.published_posts[0].published_at).toLocaleDateString() : new Date(draft.updated_at).toLocaleDateString()}
                                        {postPlatforms(draft).length > 0 && ` on ${postPlatforms(draft).join(', ')}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="h-11 md:h-9 px-4 rounded-full bg-canvas text-ink text-xs font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                >
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                                {onDuplicate && (
                                    <button
                                        onClick={async () => {
                                            setDuplicating(true);
                                            try { await onDuplicate(draft); } finally { setDuplicating(false); }
                                        }}
                                        disabled={duplicating}
                                        className="h-11 md:h-9 px-4 rounded-full bg-canvas text-ink text-xs font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-60"
                                    >
                                        {duplicating ? 'Copying…' : 'Use as new draft'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowRepurposeModal(true)}
                                    className="h-11 md:h-9 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                >
                                    Repurpose
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Opening and feed preview: how the post lands before "see more" */}
                    <div className="mb-4 flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto scrollbar-none p-2 -m-2">
                        {draft.status !== 'published' && (
                            <button
                                onClick={() => setPostTool(t => t === 'craft' ? null : 'craft')}
                                aria-pressed={postTool === 'craft'}
                                className={`shrink-0 whitespace-nowrap h-9 px-4 rounded-full bg-canvas text-xs font-medium transition-all ${postTool === 'craft' ? 'shadow-pressed text-ember-600' : 'shadow-raised text-ink-soft hover:text-ember-600 active:shadow-pressed'}`}
                            >
                                Craft score
                            </button>
                        )}
                        {draft.status !== 'published' && (
                            <button
                                onClick={() => setPostTool(t => t === 'openings' ? null : 'openings')}
                                aria-pressed={postTool === 'openings'}
                                className={`shrink-0 whitespace-nowrap h-9 px-4 rounded-full bg-canvas text-xs font-medium transition-all ${postTool === 'openings' ? 'shadow-pressed text-ember-600' : 'shadow-raised text-ink-soft hover:text-ember-600 active:shadow-pressed'}`}
                            >
                                Try other openings
                            </button>
                        )}
                        {draft.status !== 'published' && (
                            <button
                                onClick={() => setPostTool(t => t === 'variants' ? null : 'variants')}
                                aria-pressed={postTool === 'variants'}
                                className={`shrink-0 whitespace-nowrap h-9 px-4 rounded-full bg-canvas text-xs font-medium transition-all ${postTool === 'variants' ? 'shadow-pressed text-ember-600' : 'shadow-raised text-ink-soft hover:text-ember-600 active:shadow-pressed'}`}
                            >
                                Variants
                            </button>
                        )}
                        <button
                            onClick={() => setPostTool(t => t === 'preview' ? null : 'preview')}
                            aria-pressed={postTool === 'preview'}
                            className={`shrink-0 whitespace-nowrap h-9 px-4 rounded-full bg-canvas text-xs font-medium transition-all ${postTool === 'preview' ? 'shadow-pressed text-ember-600' : 'shadow-raised text-ink-soft hover:text-ember-600 active:shadow-pressed'}`}
                        >
                            LinkedIn preview
                        </button>
                    </div>
                    {postTool && (
                        <div className="mb-6 bg-surface rounded-card shadow-card p-5 md:p-6">
                            {postTool === 'craft' && <CraftScorePanel content={content} brainMetadata={draft.brain_metadata} onApply={setContent} disabled={draft.status === 'published'} />}
                            {postTool === 'openings' && <HookLab content={content} brainMetadata={draft.brain_metadata} onApply={setContent} disabled={draft.status === 'published'} />}
                            {postTool === 'variants' && <VariantsPanel content={content} brainMetadata={draft.brain_metadata} onApply={setContent} disabled={draft.status === 'published'} />}
                            {postTool === 'preview' && <LinkedInPreview content={content} />}
                        </div>
                    )}

                    {draft.status !== 'published' && placeholders.length > 0 && (
                        <div className="mb-4">
                            <PlaceholderNotice placeholders={placeholders} onJump={jumpToPlaceholder} />
                        </div>
                    )}

                    {/* Document Surface - Canvas (white writing card on the grey canvas) */}
                    <div className="bg-surface rounded-card shadow-card px-5 py-8 md:px-14 md:py-14">
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
                    </div>

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
