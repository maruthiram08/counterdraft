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

        } catch (err: any) {
            setError(err.message);
            setStatus("");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                        <Upload size={20} className="text-[var(--accent)]" />
                        <h2 className="font-semibold">Add More Content</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                        Paste additional posts, essays, or notes. We'll extract new beliefs and tensions.
                    </p>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={loading}
                        className="w-full h-64 p-4 border border-[var(--border)] rounded-lg resize-none focus:ring-2 ring-[var(--accent)] outline-none font-mono text-sm"
                        placeholder="Paste your content here..."
                    />

                    {error && (
                        <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}

                    {status && !error && (
                        <p className="text-[var(--accent)] text-sm mt-2 flex items-center gap-2">
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            {status}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)] bg-[var(--surface)]">
                    <button onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || loading}
                        className="btn btn-primary flex items-center gap-2"
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
