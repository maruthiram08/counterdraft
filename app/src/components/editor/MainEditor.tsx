// Imports updated
import { useState, useEffect, useRef } from "react";
import { Save, Check, Copy, Sparkles } from "lucide-react";
import { Draft } from "@/hooks/useDrafts";
import { ContextualToolbar } from "./ContextualToolbar";
import { getCaretCoordinates } from "@/lib/textarea-utils";

interface MainEditorProps {
    draft: Draft | null;
    onSave: (id: string, content: string) => Promise<boolean>;
}

export function MainEditor({ draft, onSave }: MainEditorProps) {
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    // Contextual selection state
    const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [refining, setRefining] = useState(false);

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Timeout for delayed hiding
    const blurTimeoutRef = useRef<NodeJS.Timeout>(null);

    // Sync content when draft selection changes
    useEffect(() => {
        if (draft) {
            setContent(draft.content);
        } else {
            setContent("");
        }
    }, [draft]);

    const handleSave = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            await onSave(draft.id, content);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

        // top/left from getCaretCoordinates are relative to the element (textarea content box)
        // rect.top/left are viewport coordinates of the element
        // We add them together to get the viewport coordinate of the caret

        // Note: getCaretCoordinates doesn't account for scrollLeft/scrollTop of the textarea itself usually,
        // but for a growing textarea that doesn't scroll internally (resize-none, auto-height), it's fine.
        // If it did scroll, we'd subtract textarea.scrollTop.
        // Since we use auto-height textarea, scroll is handled by parent.

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

            if (data.refinedContent) {
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

    if (!draft) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-8 bg-white">
                <p className="font-serif italic text-lg opacity-50">Select a draft to start writing...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative group bg-white">

            {/* Contextual Toolbar */}
            {toolbarPosition && (
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[60]">
                    {/* Placeholder for hierarchy, component is rendered below */}
                </div>
            )}

            {/* Minimal Header / Status - Floating Pill */}
            <div className="absolute top-6 right-8 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 rounded-full px-2 py-1">
                    <span className="text-xs text-[var(--text-muted)] px-2 font-medium">
                        {saving ? "Saving..." : saved ? "Saved" : ""}
                    </span>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-gray-400 hover:text-[var(--foreground)] hover:bg-gray-50 rounded-full transition-all"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="p-1.5 text-gray-400 hover:text-[var(--accent)] hover:bg-gray-50 rounded-full transition-all"
                        title="Save changes"
                    >
                        <Save size={16} />
                    </button>
                </div>
            </div>

            {/* Document Surface */}
            <div className="flex-1 overflow-y-auto relative">
                {/* Note: Added relative here to anchor toolbar */}
                <div className="max-w-4xl mx-auto py-20 px-16 min-h-full relative">

                    {/* Toolbar anchored relative to this container */}
                    {/* adjusting left/top by adding padding offsets? 
                        getCaretCoordinates includes padding/border in its calculation relative to the element (textarea).
                        So if textarea is here, we can place toolbar here. 
                    */}
                    {toolbarPosition && (
                        <ContextualToolbar
                            position={toolbarPosition}
                            onOptionSelect={handleExecuteRefinement}
                            onCustomInput={handleExecuteRefinement}
                            onClose={() => setToolbarPosition(null)}
                            loading={refining}
                        />
                    )}

                    {/* Title / Context - Refined Typography */}
                    <div className="mb-12 select-none">
                        <h2 className="text-3xl font-serif font-medium text-gray-800 leading-tight mb-6">
                            {draft.belief_text}
                        </h2>
                        {/* Subtle separator */}
                        <div className="flex justify-center">
                            <div className="w-8 h-1 bg-[var(--accent)]/10 rounded-full mb-8"></div>
                        </div>
                    </div>

                    {/* Editor */}
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
                        onClick={() => {
                            // Clicking might clear selection or start new one
                            // handleSelect fires on click too if care position changes
                        }}
                        onBlur={() => {
                            // Small delay to allow clicking toolbar buttons
                            blurTimeoutRef.current = setTimeout(() => {
                                // Careful! Don't clear if we clicked the toolbar
                                // This is tricky. Better to let clicking outside clear it via onOptionSelect or similar
                                // or use a click-away listener on the container.
                                // For now, rely on explicit close or re-selection.
                            }, 200);
                        }}
                        className="w-full min-h-[60vh] resize-none border-none outline-none focus:outline-none focus:ring-0 ring-0 text-lg leading-loose text-gray-700 font-serif placeholder:text-gray-300 bg-transparent selection:bg-[var(--accent)]/10 overflow-hidden"
                        placeholder="Start writing..."
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}
