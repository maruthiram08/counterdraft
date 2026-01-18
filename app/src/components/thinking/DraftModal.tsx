"use client";

import { useState } from "react";
import { X, RefreshCw, Copy, Check, Sparkles } from "lucide-react";

interface DraftModalProps {
    belief: string;
    isOpen: boolean;
    onClose: () => void;
}

export function DraftModal({ belief, isOpen, onClose }: DraftModalProps) {
    const [draft, setDraft] = useState("");
    const [angles, setAngles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateDraft = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ beliefStatement: belief }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to generate");

            setDraft(data.draft);
            setAngles(data.angles || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(draft);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-generate on open
    useState(() => {
        if (isOpen && !draft && !loading) {
            generateDraft();
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-[var(--accent)]" />
                        <h2 className="font-semibold">Draft from Belief</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Belief */}
                <div className="p-4 bg-[var(--surface)] border-b border-[var(--border)]">
                    <p className="text-sm text-[var(--text-muted)]">Based on your belief:</p>
                    <p className="font-medium mt-1">"{belief}"</p>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[400px]">
                    {loading ? (
                        <div className="text-center py-12">
                            <RefreshCw size={32} className="mx-auto animate-spin text-[var(--accent)] mb-4" />
                            <p className="text-[var(--text-muted)]">Generating your draft...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button onClick={generateDraft} className="btn btn-secondary">
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                className="w-full h-64 p-4 border border-[var(--border)] rounded-lg resize-none focus:ring-2 ring-[var(--accent)] outline-none"
                                placeholder="Your draft will appear here..."
                            />

                            {angles.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-[var(--text-muted)] mb-2">Alternative angles:</p>
                                    <ul className="space-y-1">
                                        {angles.map((angle, i) => (
                                            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                                                <span className="text-[var(--accent)]">•</span>
                                                {angle}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--surface)]">
                    <button
                        onClick={generateDraft}
                        disabled={loading}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Regenerate
                    </button>

                    <button
                        onClick={handleCopy}
                        disabled={!draft || loading}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? "Copied!" : "Copy to Clipboard"}
                    </button>
                </div>
            </div>
        </div>
    );
}
