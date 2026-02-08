
import { useState, useEffect } from "react";
import type { Draft } from "@/types";

export function useEditorState(draft: Draft | null, onSave: (id: string, content: string) => Promise<boolean>) {
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    // Sync content when draft selection changes
    useEffect(() => {
        if (!draft) {
            setContent("");
            setCoverImage(null);
            return;
        }

        const coverMatch = draft.content.match(/^!\[(.*?)\]\((.*?)\)(\n\n)?/);
        if (coverMatch) {
            setCoverImage(coverMatch[2]);
            setContent(draft.content.replace(coverMatch[0], ''));
        } else {
            setCoverImage(null);
            setContent(draft.content);
        }
    }, [draft]);

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
            const fullContent = getFullContent();
            await onSave(draft.id, fullContent);
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

    return {
        content,
        setContent,
        coverImage,
        setCoverImage,
        saving,
        setSaving, // Exported for external triggers if needed
        saved,
        copied,
        handleSave,
        handleCopy,
        getFullContent
    };
}
