"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Check, Copy } from "lucide-react";
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
                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 rounded-full px-4 py-1.5">
                    <span className="text-xs text-[var(--text-muted)] font-medium mr-2">
                        {saving ? "Saving..." : saved ? "Saved" : "Draft"}
                    </span>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                        onClick={handleCopy}
                        className="text-xs font-medium text-gray-500 hover:text-[var(--foreground)] px-2 py-1 hover:bg-gray-50 rounded-md transition-all"
                    >
                        {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs font-medium text-gray-500 hover:text-[var(--accent)] px-2 py-1 hover:bg-gray-50 rounded-md transition-all"
                    >
                        Save
                    </button>
                </div>
            </div>

            {/* Document Surface */}
            <div className="flex-1 overflow-y-auto relative">
                <div className="max-w-4xl mx-auto py-20 px-16 min-h-full relative">

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

                    {/* Editor - Switched to font-sans for cleaner look */}
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
                        className="w-full min-h-[60vh] resize-none text-lg leading-loose text-gray-700 font-sans placeholder:text-gray-300 bg-transparent selection:bg-[var(--accent)]/10 overflow-hidden"
                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                        placeholder="Start writing..."
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}
