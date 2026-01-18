"use client";

import { useState } from "react";
import { FileText, Copy, Trash2, Check, Clock } from "lucide-react";
import type { Draft } from "@/hooks/useDrafts";

interface DraftCardProps {
    draft: Draft;
    onDelete: (id: string) => void;
    onEdit: (draft: Draft) => void;
}

export function DraftCard({ draft, onDelete, onEdit }: DraftCardProps) {
    const [copied, setCopied] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(draft.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete(draft.id);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    // Truncate content for preview
    const preview = draft.content.length > 150
        ? draft.content.substring(0, 150) + '...'
        : draft.content;

    return (
        <div className="card hover:border-[var(--accent)] transition-colors group">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-[var(--accent)]">
                    <FileText size={18} />
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Draft</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-subtle)]">
                    <Clock size={12} />
                    {formatDate(draft.created_at)}
                </div>
            </div>

            {/* Belief Source */}
            <div className="mb-3">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Based on belief</span>
                <p className="text-sm font-medium text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                    "{draft.belief_text}"
                </p>
            </div>

            {/* Content Preview */}
            <div
                onClick={() => onEdit(draft)}
                className="p-3 bg-[var(--surface)] rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mb-4"
            >
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {preview}
                </p>
                {draft.content.length > 150 && (
                    <span className="text-xs text-[var(--accent)] mt-2 inline-block">Click to view full draft →</span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 rounded transition-colors"
                >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy"}
                </button>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                >
                    <Trash2 size={14} />
                    {deleting ? "Deleting..." : "Delete"}
                </button>
            </div>
        </div>
    );
}
