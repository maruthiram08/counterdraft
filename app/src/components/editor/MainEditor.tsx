"use client";

import { useState, useEffect } from "react";
import { Save, Check, Copy, Share } from "lucide-react";
import { Draft } from "@/hooks/useDrafts";

interface MainEditorProps {
    draft: Draft | null;
    onSave: (id: string, content: string) => Promise<boolean>;
}

export function MainEditor({ draft, onSave }: MainEditorProps) {
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

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

    if (!draft) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-8 bg-white">
                <p className="font-serif italic text-lg opacity-50">Select a draft to start writing...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative group bg-white">

            {/* Minimal Header / Status - Floats on top */}
            <div className="absolute top-4 right-8 flex items-center gap-2 z-10 transition-opacity opacity-0 group-hover:opacity-100 duration-300">
                <span className="text-xs text-[var(--text-muted)] mr-2 font-medium">
                    {saving ? "Saving..." : saved ? "Saved" : ""}
                </span>
                <button
                    onClick={handleCopy}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-gray-100 rounded-md transition-colors"
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-gray-100 rounded-md transition-colors"
                    title="Save changes"
                >
                    <Save size={16} />
                </button>
            </div>

            {/* Document Surface */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto py-16 px-12 min-h-full">

                    {/* Title / Context */}
                    <div className="mb-10 select-none">
                        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium mb-2 block">
                            Current Belief
                        </span>
                        <h2 className="text-xl font-serif font-medium text-[var(--foreground)] leading-tight mb-4">
                            {draft.belief_text}
                        </h2>
                        <div className="h-px w-12 bg-gray-200"></div>
                    </div>

                    {/* Editor */}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full min-h-[60vh] resize-none focus:outline-none text-lg leading-loose text-[var(--text-primary)] font-serif placeholder:text-gray-300 bg-transparent"
                        placeholder="Start writing..."
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}
