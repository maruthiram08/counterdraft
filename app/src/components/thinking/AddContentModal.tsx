"use client";

import { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";

interface AddContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddContentModal({ isOpen, onClose, onSuccess }: AddContentModalProps) {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState("");

    const handleSubmit = async () => {
        if (!content.trim()) return;

        setLoading(true);
        setError(null);
        setStatus("Sending to analysis...");

        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    source: "user_upload",
                    isInspiration: false,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Ingestion failed");

            setStatus("Analysis complete!");

            setTimeout(() => {
                setContent("");
                onSuccess();
                onClose();
            }, 1500);

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred");
            setStatus("");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-card max-w-2xl w-full shadow-float">
                {/* Header */}
                <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-2">
                    <div className="flex items-center gap-2">
                        <Upload size={20} className="text-ember-500" />
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Add More Content</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 md:px-8 py-4">
                    <p className="text-sm text-ink-soft mb-4">
                        Paste additional posts, essays, or notes. We&apos;ll extract new beliefs and tensions.
                    </p>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={loading}
                        className="w-full h-64 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 resize-none focus:outline-none focus:ring-2 focus:ring-ember-200 font-mono text-sm"
                        placeholder="Paste your content here..."
                    />

                    {error && (
                        <p className="text-rose-700 text-sm mt-2">{error}</p>
                    )}

                    {status && !error && (
                        <p className="text-ember-600 text-sm mt-2 flex items-center gap-2">
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            {status}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 md:px-8 pt-2 pb-6 md:pb-8">
                    <button onClick={onClose} className="h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || loading}
                        className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            "Analyze Content"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
