"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, Copy, Check, Sparkles, Save } from "lucide-react";

interface DraftModalProps {
    belief: string;
    isOpen: boolean;
    onClose: () => void;
    onSave?: (beliefText: string, content: string) => Promise<any>;
}

export function DraftModal({ belief, isOpen, onClose, onSave }: DraftModalProps) {
    const [draft, setDraft] = useState("");
    const [angles, setAngles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateDraft = async (instruction?: string) => {
        setLoading(true);
        setError(null);
        // Only clear draft if completely regenerating from scratch, 
        // OR keep it to show "Regenerating..." overlay? 
        // User prefers clearer state. Let's plain clear it or show different loader.
        // For now, simple loading state handles it.

        try {
            const res = await fetch("/api/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    beliefStatement: belief,
                    instruction // Pass the selected angle if present
                }),
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

    const handleSave = async () => {
        if (!onSave || !draft) return;
        setSaving(true);
        try {
            await onSave(belief, draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Error saving draft:', err);
        } finally {
            setSaving(false);
        }
    };

    // Reset state when belief changes
    useEffect(() => {
        setDraft("");
        setAngles([]);
        setError(null);
        setSaved(false);
    }, [belief]);

    // Auto-generate on open
    useEffect(() => {
        if (isOpen && belief && !loading && !draft) {
            generateDraft();
        }
    }, [isOpen, belief]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-[var(--accent)]" />
                        <h2 className="font-semibold text-gray-900">Draft from Belief</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900">
                        <X size={20} />
                    </button>
                </div>

                {/* Belief */}
                <div className="p-5 bg-gray-50/50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Based on your belief</p>
                    <p className="font-serif text-lg text-gray-800 leading-relaxed border-l-2 border-[var(--accent)] pl-4">
                        "{belief}"
                    </p>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto flex-1 min-h-[400px] relative bg-white">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 transition-all">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={16} className="text-[var(--accent)] animate-pulse" />
                                </div>
                            </div>
                            <p className="text-sm font-medium text-gray-500 mt-4 animate-pulse">
                                {draft ? "Refining angle..." : "Writing your draft..."}
                            </p>
                        </div>
                    ) : null}

                    {error ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button onClick={() => generateDraft()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="p-6 space-y-8">
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                className="w-full h-[300px] p-0 border-0 resize-none outline-none font-serif text-lg leading-loose text-gray-700 placeholder:text-gray-300 bg-transparent"
                                placeholder="Your draft will appear here..."
                            />

                            {angles.length > 0 && (
                                <div className="space-y-3 pt-6 border-t border-gray-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <RefreshCw size={14} className="text-[var(--accent)]" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Try a different angle</p>
                                    </div>
                                    <div className="grid gap-2">
                                        {angles.map((angle, i) => (
                                            <button
                                                key={i}
                                                onClick={() => generateDraft(angle)}
                                                disabled={loading}
                                                className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-[var(--accent)] hover:shadow-md hover:bg-white transition-all group bg-gray-50/30 hover:scale-[1.01] active:scale-[0.99] duration-200"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[var(--accent)] text-lg leading-none">•</span>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 leading-relaxed block">
                                                            {angle}
                                                        </span>
                                                        <span className="text-xs text-[var(--accent)] font-medium mt-1 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-4px] group-hover:translate-x-0 duration-200">
                                                            Generate this version <RefreshCw size={10} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--surface)]">
                    <button
                        onClick={() => generateDraft()}
                        disabled={loading || saving}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Regenerate
                    </button>

                    <div className="flex items-center gap-2">
                        {onSave && (
                            <button
                                onClick={handleSave}
                                disabled={!draft || loading || saving}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                {saved ? <Check size={16} className="text-green-500" /> : <Save size={16} />}
                                {saving ? "Saving..." : saved ? "Saved!" : "Save Draft"}
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            disabled={!draft || loading}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
