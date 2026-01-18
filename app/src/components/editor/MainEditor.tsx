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
            <div className="absolute top-6 right-8 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-xs text-[var(--text-muted)] mr-2 font-medium">
                    {saving ? "Saving..." : saved ? "Saved" : ""}
                </span>
                <button
                    onClick={handleCopy}
                    className="p-2 text-gray-400 hover:text-[var(--foreground)] hover:bg-gray-50 rounded-lg transition-all"
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-2 text-gray-400 hover:text-[var(--accent)] hover:bg-gray-50 rounded-lg transition-all"
                    title="Save changes"
                >
                    <Save size={18} />
                </button>
            </div>

            {/* Document Surface */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-20 px-16 min-h-full">

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
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full min-h-[60vh] resize-none focus:outline-none text-lg leading-loose text-gray-700 font-serif placeholder:text-gray-300 bg-transparent selection:bg-[var(--accent)]/10"
                        placeholder="Start writing..."
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}
