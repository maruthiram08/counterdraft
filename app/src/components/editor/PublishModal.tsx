"use client";

import { useState } from 'react';
import { X, Loader2, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    draftId: string;
    content: string;
    beliefText: string;
}

/**
 * PublishModal - Downstream publishing experience
 * 
 * Design principle: "When you're ready, this exists."
 * - No nudging toward publishing
 * - Preview what will be posted
 * - Character count warning
 * - Simple confirmation
 */
export function PublishModal({
    isOpen,
    onClose,
    draftId,
    content,
    beliefText,
}: PublishModalProps) {
    const [publishing, setPublishing] = useState(false);
    const [published, setPublished] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [postUrl, setPostUrl] = useState<string | null>(null);

    // Format content for preview (strip markdown)
    const previewContent = content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .trim();

    const characterCount = previewContent.length;
    const isOverLimit = characterCount > 3000;

    const handlePublish = async () => {
        try {
            setPublishing(true);
            setError(null);

            const res = await fetch('/api/linkedin/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftId, content }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to publish');
            }

            setPublished(true);
            setPostUrl(data.url);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to publish';
            setError(errorMessage);
        } finally {
            setPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-medium">
                        {published ? 'Published!' : 'Publish to LinkedIn'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {published ? (
                        // Success State
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-medium mb-2">Successfully Published</h3>
                            <p className="text-[var(--text-muted)] mb-6">
                                Your draft is now live on LinkedIn.
                            </p>
                            {postUrl && (
                                <a
                                    href={postUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                                >
                                    <ExternalLink size={16} />
                                    View on LinkedIn
                                </a>
                            )}
                        </div>
                    ) : (
                        // Preview State
                        <>
                            {/* Belief context */}
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs text-[var(--text-muted)] mb-1">Based on your belief:</div>
                                <div className="text-sm font-medium">{beliefText}</div>
                            </div>

                            {/* Preview */}
                            <div className="mb-4">
                                <div className="text-sm text-[var(--text-muted)] mb-2">Preview:</div>
                                <div className="p-4 border border-[var(--border)] rounded-lg bg-white">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {previewContent}
                                    </p>
                                </div>
                            </div>

                            {/* Character Count */}
                            <div className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
                                {characterCount.toLocaleString()} / 3,000 characters
                                {isOverLimit && (
                                    <span className="ml-2 font-medium">
                                        (exceeds limit)
                                    </span>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3">
                    {published ? (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium bg-[var(--surface)] border border-[var(--border)] rounded-md hover:bg-gray-50"
                        >
                            Close
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={publishing || isOverLimit}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {publishing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    'Publish to LinkedIn'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
