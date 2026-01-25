"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Copy, Save, Check, RefreshCw, Eye, Edit2, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { Draft } from "@/hooks/useDrafts";
import { ContextualToolbar } from "./ContextualToolbar";
import { PublishModal } from "./PublishModal";
import { RepurposeModal } from "./RepurposeModal";
import { VerificationSidebar, VerificationResult, PlagiarismResult, SlopMatch, CompetitorCheckResult } from "./FactCheckSidebar";
import { QualityScoreFooter } from "./QualityScoreFooter";
import { AntiSlopService } from "@/lib/tools/anti-slop";
import { getCaretCoordinates } from "@/lib/textarea-utils";

interface MainEditorProps {
    draft: Draft | null;
    onSave: (id: string, content: string) => Promise<boolean>;
}

export function MainEditor({ draft, onSave }: MainEditorProps) {
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

    // New: History Loading State
    const [historyLoading, setHistoryLoading] = useState(false);

    // 4. Refs (Keep these consistent)
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 5. Memoized Calculations
    const scores = useMemo(() => {
        const factHasRun = verifications.length > 0;
        const plagiarismHasRun = plagiarismResult !== null;
        const slopHasRun = true;

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
        const slopScore = Math.max(0, 100 - (slopMatches.length * 5));

        // Aggregate Weighted Score
        const totalScore = Math.round((factScore * 0.4) + (plagiarismScore * 0.4) + (slopScore * 0.2));

        return {
            totalScore,
            fact: { score: factScore, hasRun: factHasRun, loading: verifying || historyLoading },
            uniqueness: { score: plagiarismScore, hasRun: plagiarismHasRun, loading: checkingPlagiarism || historyLoading },
            style: { score: slopScore, hasRun: true, loading: slopLoading }
        };
    }, [verifications, plagiarismResult, slopMatches, verifying, checkingPlagiarism, slopLoading, historyLoading]);

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

            // Trigger real-time slop scan
            if (content) {
                const matches = AntiSlopService.scan(content);
                setSlopMatches(matches);
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

    const handleSave = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            await onSave(draft.id, getFullContent());
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

    const handleSlopScan = () => {
        if (!content) return;
        setSlopLoading(true);
        setShowFactCheck(true);

        // Scan is fast, so we do it client-side
        setTimeout(() => {
            const matches = AntiSlopService.scan(content);
            setSlopMatches(matches);
            setSlopLoading(false);
        }, 500);
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

    // --- Contextual Editing Handlers ---

    const handleSelect = () => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;

        // Ensure real selection (at least 2 chars)
        if (start === end || (end - start) < 2) {
            setToolbarPosition(null);
            setSelectionRange(null);
            return;
        }

        // Calculate Pixel Coordinates
        const { top, left, height } = getCaretCoordinates(textareaRef.current, start);

        // FIX: Use viewport-relative coordinates for fixed positioning
        // This ensures the toolbar stays attached to the text even when scrolling
        const rect = textareaRef.current.getBoundingClientRect();
        const fixedTop = rect.top + top;
        const fixedLeft = rect.left + left;

        setSelectionRange({ start, end });
        setToolbarPosition({ top: fixedTop, left: fixedLeft });
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

    // Simple Markdown Parser (Regex Based)
    const parseMarkdown = (text: string) => {
        let html = text
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

        return html;
    };

    const renderHighlights = () => {
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

            {/* Minimal Header / Status - Floating Pill */}
            <div className="absolute top-6 right-8 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 rounded-full px-4 py-1.5">
                    {/* View Toggle */}
                    <button
                        onClick={() => setIsPreview(!isPreview)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all border mr-2 ${isPreview
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'}`}
                    >
                        {isPreview ? <Edit2 size={12} /> : <Eye size={12} />}
                        {isPreview ? 'Edit' : 'Preview'}
                    </button>

                    <span className="text-xs text-[var(--text-muted)] font-medium mr-2">
                        {saving ? "Saving..." : saved ? "Saved" : "Draft"}
                    </span>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                        onClick={handleCopy}
                        className="text-xs font-medium text-gray-500 hover:text-[var(--foreground)] px-2 py-1 hover:bg-gray-50 rounded-md transition-all"
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs font-medium text-gray-500 hover:text-[var(--accent)] px-2 py-1 hover:bg-gray-50 rounded-md transition-all"
                    >
                        <Save size={12} />
                    </button>
                    {/* Customize Button */}
                    <button
                        onClick={() => setShowRepurposeModal(true)}
                        className="text-xs font-medium text-indigo-500 hover:text-indigo-600 px-2 py-1 hover:bg-indigo-50 rounded-md transition-all"
                    >
                        <RefreshCw size={12} />
                    </button>

                    {/* Fact Check Button */}
                    <button
                        onClick={() => setShowFactCheck(true)}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 hover:bg-teal-50 rounded-md transition-all"
                        title="Verify Claims"
                    >
                        <ShieldCheck size={12} />
                    </button>

                    {/* Design Download (Instagram Only) */}
                    {draft.platform === 'instagram' && (
                        <button
                            onClick={handleDownloadDesign}
                            className="text-xs font-medium text-pink-500 hover:text-pink-600 px-2 py-1 hover:bg-pink-50 rounded-md transition-all"
                            title="Download Design File"
                        >
                            <ImageIcon size={12} />
                        </button>
                    )}
                    {/* Publish */}
                    <button
                        onClick={() => setShowPublishModal(true)}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-50 rounded-md transition-all"
                    >
                        Publish
                    </button>
                </div>
            </div>

            {/* Document Surface */}
            <div className="flex-1 overflow-y-auto relative">
                <div className="max-w-4xl mx-auto py-8 md:py-20 px-4 md:px-16 min-h-full relative">

                    {toolbarPosition && (
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

                    {/* Title / Context - Refined Typography */}
                    <div className="mb-6 md:mb-12 select-none">
                        <h2 className="text-xl md:text-3xl font-serif font-medium text-gray-800 leading-tight mb-4 md:mb-6 break-words">
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
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    // Auto-resize on input
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                onSelect={handleSelect}
                                onBlur={() => {
                                    blurTimeoutRef.current = setTimeout(() => { }, 200);
                                }}
                                className="w-full min-h-[40vh] md:min-h-[60vh] resize-none text-base md:text-lg leading-relaxed md:leading-loose text-gray-700 font-sans placeholder:text-gray-300 bg-transparent selection:bg-[var(--accent)]/10 overflow-hidden break-words relative z-10"
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
            <QualityScoreFooter
                score={scores.totalScore}
                metrics={{
                    fact: scores.fact,
                    uniqueness: scores.uniqueness,
                    style: scores.style
                }}
                onRunMetric={handleRunMetric}
                onOpenSidebar={() => setShowFactCheck(true)}
                isVisible={true}
            />
            <VerificationSidebar
                isOpen={showFactCheck}
                onClose={() => setShowFactCheck(false)}
                factResults={verifications}
                factLoading={verifying || historyLoading}
                onFactVerify={handleVerify}
                plagiarismResult={plagiarismResult}
                plagiarismLoading={checkingPlagiarism || historyLoading}
                onPlagiarismCheck={handlePlagiarismCheck}
                slopMatches={slopMatches}
                slopLoading={slopLoading}
                onSlopScan={handleSlopScan}
                competitorResult={competitorResult}
                competitorLoading={competitorLoading}
                onCompetitorCheck={handleCompetitorCheck}
            />
        </div>
    );
}
