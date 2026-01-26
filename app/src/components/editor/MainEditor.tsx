"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Copy, Save, Check, RefreshCw, Eye, Edit2, Image as ImageIcon } from "lucide-react";
import { Draft } from "@/hooks/useDrafts";
import { ContextualToolbar } from "./ContextualToolbar";
import { PublishModal } from "./PublishModal";
import { RepurposeModal } from "./RepurposeModal";
import { getCaretCoordinates } from "@/lib/textarea-utils";

interface MainEditorProps {
    draft: Draft | null;
    onSave: (id: string, content: string) => Promise<boolean>;
}

export function MainEditor({ draft, onSave }: MainEditorProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    // Preview Mode State
    const [isPreview, setIsPreview] = useState(false);

    // Contextual selection state
    const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [refining, setRefining] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showRepurposeModal, setShowRepurposeModal] = useState(false);
    const [isRepurposing, setIsRepurposing] = useState(false);

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout>(null);

    // Sync content when draft selection changes
    useEffect(() => {
        if (draft) {
            // Check for Cover Image in Markdown
            const coverMatch = draft.content.match(/^!\[(.*?)\]\((.*?)\)(\n\n)?/);

            if (coverMatch) {
                setCoverImage(coverMatch[2]);
                // Remove the image markdown from the editor view
                const cleanContent = draft.content.replace(coverMatch[0], '');
                setContent(cleanContent);
            } else {
                setCoverImage(null);
                setContent(draft.content);
            }
        } else {
            setContent("");
            setCoverImage(null);
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

            const data = await res.json();

            if (data.id) {
                return data; // Success
            } else {
                console.warn("Repurpose API returned success but no ID:", data);
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
                                // Small delay to allow clicking toolbar buttons
                                blurTimeoutRef.current = setTimeout(() => {
                                    // For now, rely on explicit close or re-selection.
                                }, 200);
                            }}
                            className="w-full min-h-[40vh] md:min-h-[60vh] resize-none text-base md:text-lg leading-relaxed md:leading-loose text-gray-700 font-sans placeholder:text-gray-300 bg-transparent selection:bg-[var(--accent)]/10 overflow-hidden break-words"
                            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                            placeholder="Start writing..."
                            spellCheck={false}
                        />
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
        </div>
    );
}
