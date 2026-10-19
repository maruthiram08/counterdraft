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

    const characterCount = content.length;

    const isOverLimit = characterCount > 5000;
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-card shadow-float max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 md:px-8 md:pt-8">
                    <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">
                        {published ? 'Published!' : 'Publish to LinkedIn'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-4">
                    {published ? (
                        // Success State
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} className="text-sage-700" />
                            </div>
                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Successfully Published</h3>
                            <p className="text-ink-soft mb-6">
                                Your draft is now live on LinkedIn.
                            </p>
                            {postUrl && (
                                <a
                                    href={postUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
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
                            <div className="mb-4 p-4 bg-canvas shadow-well rounded-2xl">
                                <div className="text-sm text-ink-muted mb-1">Based on your belief:</div>
                                <div className="text-sm font-medium text-ink">{beliefText}</div>
                            </div>

                            {/* Preview (Read-Only) */}
                            <div className="mb-4 flex-1 flex flex-col min-h-0">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm text-ink-muted">Post Preview:</div>
                                    <div className={`text-xs ${content.length > 5000 ? 'text-rose-700 font-medium' : 'text-ink-muted'}`}>
                                        {content.length.toLocaleString()} / 5,000
                                    </div>
                                </div>
                                <textarea
                                    className="w-full px-4 py-3 border-0 rounded-2xl bg-canvas shadow-well text-ink font-sans text-sm leading-relaxed resize-none focus:outline-none cursor-default"
                                    value={content}
                                    readOnly
                                    rows={12}
                                />
                            </div>



                            {/* Error */}
                            {error && (
                                <div className="mt-4 p-4 bg-rose-100 rounded-tile flex items-start gap-2 text-rose-700">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-4 md:px-8 md:pb-8 flex flex-wrap justify-end gap-3">
                    {published ? (
                        <button
                            onClick={onClose}
                            className="h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                        >
                            Close
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="h-10 px-4 rounded-full text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onClose}
                                className="h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                            >
                                Edit Draft
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={publishing || isOverLimit}
                                className="h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
