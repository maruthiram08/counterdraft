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
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-8">
                <p>Select a draft from the sidebar to start editing</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
                <div className="overflow-hidden">
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold block mb-0.5">Editing Draft for</span>
                    <h2 className="text-sm font-medium truncate" title={draft.belief_text}>
                        {draft.belief_text}
                    </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleCopy}
                        className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                        {saved ? <Check size={14} /> : <Save size={14} />}
                        {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* Editor Surface */}
            <div className="flex-1 overflow-hidden p-8 bg-gray-50/50">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-full p-8 bg-white shadow-sm border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-lg leading-relaxed text-[var(--text-primary)] font-serif"
                    placeholder="Start writing..."
                />
            </div>
        </div>
    );
}
