"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Draft } from "@/types";
import { ContextualToolbar } from "./ContextualToolbar";
import { PublishModal } from "./PublishModal";
import { RepurposeModal } from "./RepurposeModal";
import { VerificationSidebar, SlopMatch } from "./FactCheckSidebar";
import { AntiSlopService } from "@/lib/tools/anti-slop";
import { EditorHeader } from "./EditorHeader";
import { EditorCanvas } from "./EditorCanvas";

// Refactored Hooks & Utils
import { useVerification } from "@/hooks/editor/useVerification";
import { useEditorSelection } from "@/hooks/editor/useEditorSelection";
import { parseMarkdown, generateHighlights } from "@/lib/editor/markdown";
import type { BrainMetadata, RepurposeOptions, InstagramSlide } from "@/types";
import type { SlideContent } from "@/lib/pptx-generator";

interface MainEditorProps {
    draft: Draft | null;
    onSave: (id: string, content: string) => Promise<boolean>;
    onUpdateMetadata?: (id: string, metadata: BrainMetadata) => Promise<boolean>;
    onPublish?: (id: string, stage: string) => Promise<void>;
}

export function MainEditor({ draft, onSave, onPublish }: MainEditorProps) {

    // 1. Basic Content State
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    // 2. Mode & UI State
    const [isPreview, setIsPreview] = useState(false);

    // Selection Hook
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toolbarPosition, setToolbarPosition, selectionRange, setSelectionRange } = useEditorSelection(textareaRef);

    const [refining, setRefining] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showRepurposeModal, setShowRepurposeModal] = useState(false);
    const [isRepurposing, setIsRepurposing] = useState(false);

    // New: Voice Learning State
    const [learning, setLearning] = useState(false);
    // New: Knowledge Extraction State
    const [extracting, setExtracting] = useState(false);


    // 3. Helper to get full content with cover image
    const getFullContent = () => {
        if (coverImage) {
            return `![Cover Art](${coverImage})\n\n${content}`;
        }
        return content;
    };

    // 4. Verification Hook
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


    // Sync content when draft selection changes
    useEffect(() => {
        if (!draft) {
            setContent("");
            setCoverImage(null);
            return;
        }

        // 1. Content Sync
        const coverMatch = draft.content.match(/^!\[(.*?)\]\((.*?)\)(\n\n)?/);
        if (coverMatch) {
            setCoverImage(coverMatch[2]);
            setContent(draft.content.replace(coverMatch[0], ''));
        } else {
            setCoverImage(null);
            setContent(draft.content);
        }
    }, [draft]);

    // Constant auto-resize to prevent scrolling issues
    useEffect(() => {
        if (textareaRef.current && !isPreview) {
            // Reset to auto to correctly calculate shrink
            textareaRef.current.style.height = 'auto';
            // Set to scrollHeight to fit content
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content, isPreview]);


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
                    // Subtle notification
                    console.log(`[Knowledge] Extracted ${data.analysis.beliefs} beliefs, ${data.analysis.tensions} tensions.`);
                }
            }
        } catch (e) {
            console.error("Extraction failed", e);
        } finally {
            setExtracting(false);
        }
    };

    const handleSave = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            const fullContent = getFullContent();
            await onSave(draft.id, fullContent);

            // Trigger extraction (don't await to keep UI responsive, but request will fire)
            handleExtractKnowledge(fullContent);

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getFullContent());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRepurpose = async (platform: string, options: RepurposeOptions) => {
        if (!draft) return null;
        setIsRepurposing(true);
        try {
            // First save current work
            await onSave(draft.id, getFullContent());

            const res = await fetch('/api/content/repurpose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: draft.id,
                    platform,
                    options
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.id) {
                    return data; // Success
                } else {
                    console.warn("Repurpose API returned success but no ID:", data);
                    return null;
                }
            } else {
                console.error("Repurpose failed with status:", res.status);
                return null;
            }
        } catch (e) {
            console.error("Repurpose Error:", e);
            alert("Failed to repurpose content. Please try again.");
            return null;
        } finally {
            setIsRepurposing(false);
            // We keep the modal open to show the Success/Design screens
        }
    };

    const handleDownloadDesign = () => {
        if (!draft || draft.platform !== 'instagram') return;

        import('@/lib/pptx-generator').then(({ PptxGenerator }) => {
            // Locally defined type to match PptxGenerator export if needed, or better, import it.
            // Since we can't easily change imports in this block without top-level changes, 
            // and PptxGenerator is imported dynamically...
            // We will trust the import if we could, but here we can just define the type match or use 'any' for the generator call
            // BUT stricter is better. Let's assume we updated imports.
            // Actually, we can't update top-level imports easily in this tool call sequence without conflicts.
            // So we will cast `slides` to `any` for the generator call to resolve the immediate blocking error, 
            // OR we define `slides` as `any[]` but keep the map strictly typed.

            // Reverting to `any[]` for `slides` accumulator to allow mixed types (SlideContent) vs existing InstagramSlide mismatch,
            // BUT we will type the mapping function's input strictly.

            const gen = new PptxGenerator();
            const slides: SlideContent[] = [];
            const metadata = draft.platform_metadata;

            if (metadata && Array.isArray(metadata.slides)) {
                const mapped = metadata.slides.map((s: InstagramSlide) => ({
                    title: s.header || "Slide",
                    body: s.body || "",
                    type: 'content' as const,
                    visualNotes: s.visualDescription
                }));
                slides.push(...mapped);
            } else {
                // Fallback: Naive Text Splitting
                const parts = content.split('\n\n').filter(p => p.trim().length > 0);
                const title = parts[0]?.replace(/^#+\s*/, '') || "Untitled";
                const bodyParts = parts.slice(1);

                bodyParts.forEach(part => {
                    slides.push({ title: title, body: part, type: 'content' });
                });
            }

            // Inject Cover Image
            if (coverImage && slides.length > 0) {
                slides[0].imageUrl = coverImage;
            }

            if (slides.length === 0) {
                slides.push({ title: "Draft", body: "No content found.", type: 'cover' });
            }

            gen.generateInstagramPost(slides);
        });
    };

    // 6. Apply Suggestion
    const handleApplySlopSuggestion = (match: SlopMatch) => {
        // String replacement logic
        // We need to be careful about indices if user has typed!
        // Ideally we re-verify before apply.
        // For now, simpler: apply at index if matches.

        const currentText = content;
        const target = currentText.substring(match.startIndex, match.endIndex);

        // Safety check: Does the text at index still match?
        if (target !== match.word) {
            console.warn("Text mismatch, operation cancelled.", target, match.word);
            // Force re-scan to fix UI
            handleSlopScan();
            return;
        }

        const pre = currentText.substring(0, match.startIndex);
        const post = currentText.substring(match.endIndex);
        const newContent = pre + match.suggestion + post;

        setContent(newContent);

        // IMPORTANT: updating content will trigger re-render, but our 'slopMatches' are now stale indices.
        // We MUST re-run scan immediately on the new content.
        // We can do this synchronously-ish since it's local regex.
        const newMatches = AntiSlopService.scan(newContent);
        setSlopMatches(newMatches);
    };


    const handleFinalize = async () => {
        if (!draft) return;
        setLearning(true);
        const toastId = toast.loading("Finalizing and updating Voice Profile...");

        try {
            // 1. Save Final Version
            await onSave(draft.id, getFullContent());

            // 2. Trigger Learning
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

                // 3. Mark as Published / Finalized

                // A. Update Pipeline (Command Center)
                // We set stage='published' but status='active' so it remains visible in the default view
                await fetch('/api/content', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: draft.id,
                        stage: 'published',
                        status: 'active', // Important: Keep active for Command Center visibility
                        published_at: new Date().toISOString()
                    })
                });

                // B. Update Editor Status (Your Posts) via Callback if available
                if (onPublish) {
                    await onPublish(draft.id, 'published');
                } else {
                    // Fallback to direct call if no handler provided (Legacy/Standalone)
                    await fetch(`/api/drafts/${draft.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: 'published'
                        })
                    });
                }

                toast.success("Draft moved to Published", { duration: 3000 });

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

            // Get context (approx 100 chars before/after)
            const contextBefore = content.substring(Math.max(0, selectionRange.start - 100), selectionRange.start);
            const contextAfter = content.substring(selectionRange.end, Math.min(content.length, selectionRange.end + 100));

            const response = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentContent: content, // passed for fallback
                    selection: selectedText,
                    instruction,
                    context: { before: contextBefore, after: contextAfter },
                    beliefContext: draft.belief_text
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Check if refinedContent exists, including empty string (for deletions)
                // We strictly check undefined/null, but allow ""
                if (data.refinedContent !== undefined && data.refinedContent !== null) {
                    // Replace only the selected part
                    const newContent = content.substring(0, selectionRange.start)
                        + data.refinedContent
                        + content.substring(selectionRange.end);

                    setContent(newContent);

                    // Hide toolbar
                    setToolbarPosition(null);
                    setSelectionRange(null);
                }
            } else {
                console.error("Refinement failed with status:", response.status);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setRefining(false);
        }
    };


    // 7. Auto-Fix Handler
    const handleFactFix = async (claim: string, analysis: string, sourceSnippet?: string, status?: string) => {
        if (!draft) return;
        setRefining(true); // Reuse refining loading state
        const toastId = toast.loading("Applying surgical fix...");

        let instruction = "";
        if (status === 'unverified' || status === 'irrelevant') {
            // For Unverified: Suggest rewrite or deletion
            instruction = `The claim "${claim}" could not be verified by sources (Status: ${status}). Review the analysis: "${analysis}". 
             If this claim is central to the argument, rewrite it to be more precise/hypothetical. 
             If it is unsupported fluff, DELETE it completely.`;
        } else {
            // For Disputed: Correct with evidence
            instruction = `The claim "${claim}" is factually DISPUTED. Correct it immediately using this verified evidence: "${analysis}". 
             ${sourceSnippet ? `Source context: ${sourceSnippet}` : ''} 
             Keep the rest of the text unchanged and maintain the original tone.`;
        }

        try {
            // We use the same 'auto_fix_strategy' endpoint which uses the "Surgical Editor" prompt
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'auto_fix_strategy',
                    draft: content,
                    fix_instruction: instruction,
                    brainMetadata: {
                        outcome: 'Accuracy',
                        audience: { role: 'General Reader' }
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.draft) {
                    setContent(data.draft);
                    toast.success("Fix applied!", { id: toastId });
                    // Re-run verification to signal "Job Done"
                    handleVerify();
                } else {
                    toast.error("Fixed failed to generate.", { id: toastId });
                }
            } else {
                console.error("Auto-fix failed", res.status);
                toast.error("Server error during fix.", { id: toastId });
            }
        } catch (e) {
            console.error("Auto-fix error", e);
            toast.error("Network error.", { id: toastId });
        } finally {
            setRefining(false);
        }
    };

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
                        isPreview={isPreview}
                        parseMarkdown={parseMarkdown}
                        renderHighlights={() => generateHighlights(content, selectionRange, verifications)}
                        textareaRef={textareaRef}
                        draftStatus={draft.status}
                        beliefText={draft.belief_text}
                    />
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
                onApplySlopSuggestion={handleApplySlopSuggestion}
            />
        </div>
    );
}
