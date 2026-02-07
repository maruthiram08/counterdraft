"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Copy, Save, Check, RefreshCw, Eye, Edit2, Image as ImageIcon, ShieldCheck, Sparkles, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { Draft } from "@/hooks/useDrafts";
import { ContextualToolbar } from "./ContextualToolbar";
import { PublishModal } from "./PublishModal";
import { RepurposeModal } from "./RepurposeModal";
import { VerificationSidebar, VerificationResult, PlagiarismResult, SlopMatch, CompetitorCheckResult } from "./FactCheckSidebar";
import { AntiSlopService } from "@/lib/tools/anti-slop";
import { getCaretCoordinates } from "@/lib/textarea-utils";
import DOMPurify from 'isomorphic-dompurify';

import { StrategyBar } from "./StrategyBar";

interface MainEditorProps {
    draft: Draft | null;
    onSave: (id: string, content: string) => Promise<boolean>;
    onUpdateMetadata?: (id: string, metadata: any) => Promise<boolean>;
    onPublish?: (id: string, stage: string) => Promise<void>;
}

export function MainEditor({ draft, onSave, onUpdateMetadata, onPublish }: MainEditorProps) {
    const router = useRouter();

    // 1. Basic Content State
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    // 2. Mode & UI State
    const [isPreview, setIsPreview] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [refining, setRefining] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showRepurposeModal, setShowRepurposeModal] = useState(false);
    const [isRepurposing, setIsRepurposing] = useState(false);

    // 3. Quality / Verification State
    const [showFactCheck, setShowFactCheck] = useState(false);
    const [verifications, setVerifications] = useState<VerificationResult[]>([]);
    const [verifying, setVerifying] = useState(false);
    const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
    const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
    const [slopMatches, setSlopMatches] = useState<SlopMatch[]>([]);
    const [slopLoading, setSlopLoading] = useState(false);
    const [competitorResult, setCompetitorResult] = useState<CompetitorCheckResult | null>(null);
    const [competitorLoading, setCompetitorLoading] = useState(false);

    // New: Explicit State for Human Audit Run
    const [slopHasRun, setSlopHasRun] = useState(false);

    // New: History Loading State
    const [historyLoading, setHistoryLoading] = useState(false);

    // New: Voice Learning State
    const [learning, setLearning] = useState(false);
    // New: Knowledge Extraction State
    const [extracting, setExtracting] = useState(false);

    // 4. Refs (Keep these consistent)
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 5. Memoized Calculations
    const scores = useMemo(() => {
        const factHasRun = verifications.length > 0;
        const plagiarismHasRun = plagiarismResult !== null;
        // Use true state, not assumption
        const slopHasRunState = slopHasRun;

        // 1. Factuality Score (40%)
        // If not run, it's 0% verified.
        let factScore = 0;
        if (factHasRun) {
            const verifiedCount = verifications.filter(v => v.status === 'verified').length;
            const disputedCount = verifications.filter(v => v.status === 'disputed').length;
            factScore = Math.max(0, (verifiedCount / verifications.length) * 100 - (disputedCount * 20));
        }

        // 2. Plagiarism Score (40%)
        // If not run, it's 0% verified.
        const plagiarismScore = plagiarismResult ? plagiarismResult.uniqueness_score : 0;

        // 3. Style/Slop Score (20%)
        // If not run, return 100 (optimistic) or 0 (pessimistic)?
        // For score aggregation, we usually treat un-run as 0 or exclude.
        // Let's treat it as max(0) if issues found, but if not run, don't penalize?
        // Actually, if not run, it shouldn't contribute to "Quality".
        const slopScore = slopHasRunState ? Math.max(0, 100 - (slopMatches.length * 5)) : 0;

        // Aggregate Weighted Score
        // Normalize based on what has run?
        // For simplicity: If not run, score is 0.
        const totalScore = Math.round((factScore * 0.4) + (plagiarismScore * 0.4) + (slopScore * 0.2));

        return {
            totalScore,
            fact: { score: factScore, hasRun: factHasRun, loading: verifying || historyLoading },
            uniqueness: { score: plagiarismScore, hasRun: plagiarismHasRun, loading: checkingPlagiarism || historyLoading },
            style: { score: slopScore, hasRun: slopHasRunState, loading: slopLoading }
        };
    }, [verifications, plagiarismResult, slopMatches, verifying, checkingPlagiarism, slopLoading, historyLoading, slopHasRun]);

    const handleRunMetric = async (type: 'fact' | 'uniqueness' | 'style' | 'run-all') => {
        if (type === 'run-all') {
            // Run all missing or all audits in parallel
            setShowFactCheck(true);
            await Promise.allSettled([
                handleVerify(),
                handlePlagiarismCheck(),
                handleSlopScan()
            ]);
            return;
        }

        if (type === 'fact') handleVerify();
        else if (type === 'uniqueness') handlePlagiarismCheck();
        else if (type === 'style') handleSlopScan();
    };

    // --- Persistence: Fetch existing verification results ---
    const fetchExistingVerification = async (id: string) => {
        setHistoryLoading(true);
        try {
            // Fetch Facts
            const factRes = await fetch(`/api/tools/fact-check?draftId=${id}`);
            if (factRes.ok) {
                const factData = await factRes.json();
                if (factData.results) setVerifications(factData.results);
            }

            // Fetch Plagiarism
            const plagRes = await fetch(`/api/tools/plagiarism-check?draftId=${id}`);
            if (plagRes.ok) {
                const plagData = await plagRes.json();
                if (plagData.result) setPlagiarismResult(plagData.result);
            }

            // Trigger real-time slop scan IF we have content
            // NOTE: Only if user previously ran it? For now, we don't persist "slopHasRun" boolean in DB.
            // So we might need to assume if we load draft, we don't know.
            // But user asked for "Not Run" initially.
            // Let's leave slopHasRun false until user acts OR unless we want auto-scan on load?
            // User feedback implies they want explicit run. So keep false.
            if (content) {
                // We do NOT auto-scan here to respect the "Not Run" state.
                // UNLESS we want to load previews?
                // Let's keep it manual.
            }
        } catch (e) {
            console.error("Error fetching existing verification:", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Sync content when draft selection changes
    useEffect(() => {
        if (!draft) {
            setContent("");
            setCoverImage(null);
            setVerifications([]);
            setPlagiarismResult(null);
            setSlopMatches([]);
            setCompetitorResult(null);
            setSlopHasRun(false); // Reset state
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

        // 2. Data Persistence (Incremental Load)
        // Reset local state first to prevent flickering stale data
        setVerifications([]);
        setPlagiarismResult(null);
        setSlopMatches([]);
        setCompetitorResult(null);
        setShowFactCheck(false);

        fetchExistingVerification(draft.id);
    }, [draft?.id]); // CRITICAL: Only trigger when ID changes

    // Constant auto-resize to prevent scrolling issues
    useEffect(() => {
        if (textareaRef.current && !isPreview) {
            // Reset to auto to correctly calculate shrink
            textareaRef.current.style.height = 'auto';
            // Set to scrollHeight to fit content
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content, isPreview]);

    const getFullContent = () => {
        if (coverImage) {
            return `![Cover Art](${coverImage})\n\n${content}`;
        }
        return content;
    };

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

    const handleRepurpose = async (platform: string, options: any) => {
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
            const gen = new PptxGenerator();
            let slides: any[] = [];
            const metadata = draft.platform_metadata;

            if (metadata && Array.isArray(metadata.slides)) {
                slides = metadata.slides.map((s: any) => ({
                    title: s.header || "Slide",
                    body: s.body || "",
                    type: 'content',
                    visualNotes: s.visualDescription
                }));
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

            gen.generateInstagramPost(slides as any);
        });
    };

    const handleVerify = async () => {
        if (!draft) return;
        setVerifying(true);
        setShowFactCheck(true);

        try {
            // Auto-save first
            await onSave(draft.id, getFullContent());

            const res = await fetch('/api/tools/fact-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: content,
                    draftId: draft.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setVerifications(data.results);
                }
            } else {
                console.error("Fact check failed with status:", res.status);
            }
        } catch (e) {
            console.error("Verification failed", e);
        } finally {
            setVerifying(false);
        }
    };

    const handlePlagiarismCheck = async () => {
        if (!draft) return;
        setCheckingPlagiarism(true);
        setShowFactCheck(true); // Open the same sidebar

        try {
            await onSave(draft.id, getFullContent());

            const res = await fetch('/api/tools/plagiarism-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: content,
                    draftId: draft.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.result) {
                    setPlagiarismResult(data.result);
                }
            } else {
                console.error("Plagiarism check failed with status:", res.status);
            }
        } catch (e) {
            console.error("Plagiarism check failed", e);
        } finally {
            setCheckingPlagiarism(false);
        }
    };

    // 5. Anti-Slop / Human Scan
    // Now stateful
    const handleSlopScan = async () => {
        if (!content) return; // Added check for content
        setSlopLoading(true);
        setShowFactCheck(true); // Added to open sidebar

        try {
            // Simulate minimal delay for feel
            await new Promise(r => setTimeout(r, 600));
            const matches = AntiSlopService.scan(content);
            setSlopMatches(matches);
            setSlopHasRun(true);
        } catch (error) {
            console.error(error);
        } finally {
            setSlopLoading(false);
        }
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

    const handleCompetitorCheck = async (competitorUrl?: string) => {
        if (!draft) return;
        setCompetitorLoading(true);
        setShowFactCheck(true);

        try {
            const res = await fetch('/api/tools/competitor-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: content,
                    competitorUrl
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.result) {
                    setCompetitorResult(data.result);
                }
            } else {
                console.error("Competitor check failed with status:", res.status);
            }
        } catch (e) {
            console.error("Competitor check failed", e);
        } finally {
            setCompetitorLoading(false);
        }

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

    // --- Contextual Editing Handlers ---

    const handleSelect = useCallback(() => {
        if (!textareaRef.current) return;

        // Small timeout to allow browser to settle selection state
        setTimeout(() => {
            if (!textareaRef.current) return;

            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;

            // Ensure real selection (at least 2 chars)
            if (start === end || (end - start) < 2) {
                // Only hide if we aren't currently refining (to prevent unrelated clicks from closing it mid-operation)
                // But generally, if selection is gone, we should close.
                // We'll trust the caller to know or we strictly follow selection.
                // Actually, if we click "Actions", selection might be lost? 
                // ContextualToolbar handles "onMouseDown(preventDefault)" to keep focus.
                setToolbarPosition(null);
                setSelectionRange(null);
                return;
            }

            // Calculate Pixel Coordinates
            const { top, left, height } = getCaretCoordinates(textareaRef.current, start);

            const rect = textareaRef.current.getBoundingClientRect();

            // Clamp top to be visible (account for header ~64px + toolbar height ~60px)
            const viewportHeight = window.innerHeight;
            const toolbarHeight = 160;
            const headerOffset = 80;

            let fixedTop = rect.top + top;
            let fixedLeft = rect.left + left;

            // Ensure it doesn't go above header
            if (fixedTop < headerOffset + toolbarHeight) {
                fixedTop = fixedTop + height + headerOffset;
            }

            // Ensure it doesn't go off right screen
            if (fixedLeft > window.innerWidth - 340) {
                fixedLeft = window.innerWidth - 340;
            }

            setSelectionRange({ start, end });
            setToolbarPosition({ top: fixedTop, left: fixedLeft });
        }, 10);
    }, []);

    // Global listener to catch selection release even if mouse is outside textarea
    useEffect(() => {
        const handler = () => handleSelect();

        // Listen to document events for max reliability
        document.addEventListener('mouseup', handler);
        document.addEventListener('keyup', handler);

        // Also listen to selectionchange for good measure (debounced?) 
        // No, standard mouseup/keyup is best for "Action Finished" trigger.
        // selectionchange fires too often.

        return () => {
            document.removeEventListener('mouseup', handler);
            document.removeEventListener('keyup', handler);
        };
    }, [handleSelect]);

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

    // Simple Markdown Parser (Regex Based)
    const parseMarkdown = (text: string) => {
        const html = text
            // Headers
            .replace(/^#{3} (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-2">$1</h3>')
            .replace(/^#{2} (.*$)/gim, '<h2 class="text-2xl font-serif font-bold mt-8 mb-4 border-b border-gray-100 pb-2">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-4xl font-serif font-bold mb-6">$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/gim, '<em class="italic text-gray-800">$1</em>')
            // Blockquotes (Pull Quotes)
            .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-900 pl-5 py-2 my-6 text-xl font-serif italic text-gray-700 bg-gray-50/50 rounded-r-lg">$1</blockquote>')
            // Images
            .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" class="w-full rounded-xl my-6 shadow-sm border border-gray-100" />')
            // Links
            .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-blue-600 hover:underline decoration-blue-200 underline-offset-2">$1</a>')
            // Bullets
            .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc marker:text-gray-400 pl-1 mb-1">$1</li>')
            // Paragraphs logic: Split by double newline, wrap non-tags in p
            .split('\n\n').map(p => {
                const trimmed = p.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<')) return trimmed;
                return `<p class="mb-4 leading-relaxed text-lg text-gray-800">${trimmed.replace(/\n/g, '<br/>')}</p>`;
            }).join('');

        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'blockquote', 'img', 'a', 'li', 'ul', 'ol'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel']
        });
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
                    // We might need to pass metadata if available, but MainEditor might not have full brain metadata handy?
                    // The API tries to fetch it if draftId is passed, but here we pass 'draft' content directly.
                    // Ideally we pass brainId or similar. Let's rely on the API handling missing metadata gracefully or we simulate it.
                    // Actually, the API expects 'brainMetadata' for context. 
                    // MainEditor -> props.draft has 'platform_metadata' but maybe not full brain strategy?
                    // Let's assume the API can handle it or we pass what we have.
                    // For now, let's pass a minimal context if possible, or let the API default.
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
                    // (Optional: might be expensive, but good UX)
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

    const renderHighlights = () => {
        // 1. Priority: Show Active Selection (Persistent even when blurred)
        if (selectionRange) {
            const { start, end } = selectionRange;
            if (start >= 0 && end <= content.length) {
                const pre = content.substring(0, start).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const sel = content.substring(start, end).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const post = content.substring(end).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                // Use a distinct, clear highlight color (indigo-100 is good for 'focused' feel)
                return `${pre}<span class="bg-indigo-200">${sel}</span>${post}` + (content.endsWith('\n') ? '<br/>&nbsp;' : '');
            }
        }

        // 2. Secondary: Show Validation Highlights (if no selection)
        if (verifications.length === 0) return null;

        // Escape HTML
        let highlighted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Highlight problematic claims (disputed/unverified)
        // Check for Markdown formatting in original sentences and normalize
        // We strip markdown chars from content for matching to make it robust
        const sorted = [...verifications]
            .filter(v => v.status !== 'verified' && v.original_sentence)
            .sort((a, b) => (b.original_sentence?.length || 0) - (a.original_sentence?.length || 0));

        sorted.forEach(v => {
            const sentence = v.original_sentence!;
            const escaped = sentence.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const colorClass = v.status === 'disputed' ? 'bg-red-200/50 border-b-2 border-red-400' : 'bg-yellow-100/50 border-b-2 border-yellow-300';

            // Escape regex chars
            const safeRegex = escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            highlighted = highlighted.replace(new RegExp(safeRegex, 'g'), `<span class="${colorClass} rounded-sm">${escaped}</span>`);
        });

        // Add a trailing space/newline indicator if at the end of content to keep heights matched
        return highlighted + (content.endsWith('\n') ? '<br/>&nbsp;' : '');
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
                    <div className="sticky top-6 flex flex-row items-center justify-end gap-2 z-20 pointer-events-none mb-4 -mt-10 mr-[-20px] xl:mr-[-60px]">
                        {/* 1. View Mode Switcher (Segmented Control) */}
                        <div className="flex items-center p-1 bg-gray-100/50 backdrop-blur-sm border border-gray-200 rounded-lg pointer-events-auto transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            <button
                                onClick={() => setIsPreview(false)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!isPreview
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                <Edit2 size={12} />
                                <span>Edit</span>
                            </button>
                            <button
                                onClick={() => setIsPreview(true)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${isPreview
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                <Eye size={12} />
                                <span>Preview</span>
                            </button>
                        </div>

                        {/* 2. Actions Bar + Status */}
                        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 rounded-xl px-3 py-1.5 pointer-events-auto transition-opacity duration-300 opacity-0 group-hover:opacity-100">

                            {/* Status Badge (Non-clickable) */}
                            <div className="flex items-center gap-1.5 mr-2 pl-1 pr-3 border-r border-gray-100 select-none">
                                <div className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : extracting ? 'bg-blue-400 animate-pulse' : saved ? 'bg-green-500' : draft.status === 'published' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                    {saving ? "Saving" : extracting ? "Analyzing" : saved ? "Saved" : draft.status === 'published' ? "Published" : "Draft"}
                                </span>
                            </div>

                            <button
                                onClick={handleCopy}
                                title="Copy to Clipboard"
                                className="text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-50 rounded-lg transition-all"
                            >
                                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                            </button>

                            {draft.status !== 'published' && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    title="Save Draft (Cmd+S)"
                                    className="text-gray-400 hover:text-[var(--accent)] p-1.5 hover:bg-gray-50 rounded-lg transition-all"
                                >
                                    <Save size={14} />
                                </button>
                            )}

                            {/* Separator */}
                            <div className="w-px h-3 bg-gray-200 mx-0.5"></div>

                            {/* Customize Button */}
                            <button
                                onClick={() => setShowRepurposeModal(true)}
                                title="Repurpose / Rewrite"
                                className="text-indigo-500 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                                <RefreshCw size={14} />
                            </button>

                            {/* Separator */}
                            <div className="w-px h-3 bg-gray-200 mx-0.5"></div>

                            {/* Finalize / Learn Button */}
                            {draft.status !== 'published' && (
                                <button
                                    onClick={handleFinalize}
                                    disabled={learning}
                                    title="Finalize & Learn (Updates Voice)"
                                    className="text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                                >
                                    <BrainCircuit size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Finalize</span>
                                </button>
                            )}

                            {/* Fact Check Button */}
                            <button
                                onClick={() => setShowFactCheck(true)}
                                title="Verify Claims & Plagiarism"
                                className="text-teal-600 hover:text-teal-700 p-1.5 hover:bg-teal-50 rounded-lg transition-all"
                            >
                                <ShieldCheck size={14} />
                            </button>

                            {/* Design Download (Instagram Only) */}
                            {draft.platform === 'instagram' && (
                                <button
                                    onClick={handleDownloadDesign}
                                    title="Download Design (PPTX)"
                                    className="text-pink-500 hover:text-pink-600 p-1.5 hover:bg-pink-50 rounded-lg transition-all"
                                >
                                    <ImageIcon size={14} />
                                </button>
                            )}

                            {/* Publish (Primary) */}
                            {draft.status !== 'published' && (
                                <button
                                    onClick={() => setShowPublishModal(true)}
                                    className="ml-2 px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-lg shadow-sm transition-all"
                                >
                                    Publish
                                </button>
                            )}
                        </div>
                    </div>

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
                                <img
                                    src={coverImage}
                                    alt="Cover Art"
                                    className="w-full h-auto max-h-[400px] object-cover"
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

                    {/* Strategy Bar */}


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

                    {/* Title / Context - Refined Typography */}
                    <div className="mb-6 md:mb-12 select-none">
                        <h2 className={`text-xl md:text-3xl font-serif font-medium leading-tight mb-4 md:mb-6 break-words ${draft.status === 'published' ? 'text-gray-500' : 'text-gray-800'}`}>
                            {draft.belief_text}
                        </h2>
                        {/* Subtle separator */}
                        <div className="flex justify-center">
                            <div className="w-8 h-1 bg-[var(--accent)]/10 rounded-full mb-4 md:mb-8"></div>
                        </div>
                    </div>

                    {/* Editor / Preview Switch */}
                    {isPreview ? (
                        <div
                            className="w-full min-h-[40vh] md:min-h-[60vh] text-base md:text-lg leading-relaxed md:leading-loose text-gray-700 font-sans focus:outline-none animate-in fade-in duration-200"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
                        />
                    ) : (
                        <div className="relative w-full">
                            {/* Highlighting Backdrop */}
                            <div
                                className="absolute inset-0 pointer-events-none text-base md:text-lg leading-relaxed md:leading-loose text-transparent font-sans break-words whitespace-pre-wrap select-none p-0 bg-transparent z-0 overflow-hidden"
                                aria-hidden="true"
                                style={{
                                    whiteSpace: 'pre-wrap',
                                    overflowWrap: 'break-word',
                                }}
                                dangerouslySetInnerHTML={{ __html: renderHighlights() || '' }}
                            />

                            <textarea
                                ref={textareaRef}
                                value={content}
                                readOnly={draft.status === 'published'}
                                onChange={(e) => {
                                    if (draft.status === 'published') return;
                                    setContent(e.target.value);
                                    // Auto-resize on input
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                onBlur={() => {
                                    blurTimeoutRef.current = setTimeout(() => { }, 200);
                                }}
                                className="w-full min-h-[40vh] md:min-h-[60vh] resize-none text-base md:text-lg leading-relaxed md:leading-loose text-gray-700 font-sans placeholder:text-gray-300 bg-transparent selection:bg-[var(--accent)]/30 overflow-hidden break-words relative z-10"
                                spellCheck={false}
                                style={{
                                    outline: 'none',
                                    border: 'none',
                                    boxShadow: 'none',
                                    backgroundColor: 'transparent',
                                    color: 'inherit',
                                    whiteSpace: 'pre-wrap',
                                    overflowWrap: 'break-word',
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
                onApplySlopSuggestion={handleApplySlopSuggestion}
            />
        </div>
    );
}
