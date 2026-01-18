"use client";

import { useState } from "react";
import { Sparkles, Send, ArrowRight, Wand2 } from "lucide-react";

interface AgentSidebarProps {
    currentContent: string | null;
    beliefContext: string | null;
    onApplyParams: (refinedContent: string) => void;
}

export function AgentSidebar({ currentContent, beliefContext, onApplyParams }: AgentSidebarProps) {
    const [instruction, setInstruction] = useState("");
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);

    const handleRefine = async () => {
        if (!instruction || !currentContent) return;

        setLoading(true);
        setSuggestion(null);

        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentContent,
                    instruction,
                    beliefContext
                }),
            });

            const data = await res.json();
            if (data.refinedContent) {
                setSuggestion(data.refinedContent);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] shrink-0 bg-white">
                <div className="flex items-center gap-2 text-[var(--accent)]">
                    <Sparkles size={18} />
                    <h2 className="font-semibold text-sm">AI Companion</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    Ask me to refine, shorten, or punch up your draft.
                </p>
            </div>

            {/* Chat / Suggestion Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!currentContent ? (
                    <div className="text-center text-sm text-[var(--text-muted)] mt-8">
                        Select a draft to enable AI assistance.
                    </div>
                ) : !suggestion ? (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Quick Actions</p>
                        {["Make it punchier", "Fix grammar", "Shorten this", "Change tone to casual"].map(action => (
                            <button
                                key={action}
                                onClick={() => {
                                    setInstruction(action);
                                    // wrapper to allow firing effect manually or just setting input
                                }}
                                className="w-full text-left px-3 py-2 bg-white border border-[var(--border)] rounded-md text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                            >
                                <Wand2 size={12} className="inline mr-2" />
                                {action}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-[var(--accent)] rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-[var(--accent)]">Suggestion</span>
                            <button
                                onClick={() => setSuggestion(null)}
                                className="text-xs text-[var(--text-muted)] hover:text-red-500"
                            >
                                Dismiss
                            </button>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] mb-3 whitespace-pre-wrap">
                            {suggestion}
                        </p>
                        <button
                            onClick={() => {
                                onApplyParams(suggestion);
                                setSuggestion(null);
                                setInstruction("");
                            }}
                            className="w-full btn btn-primary text-xs py-1.5"
                        >
                            Apply to Editor
                        </button>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-[var(--border)] shrink-0">
                <div className="relative">
                    <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="Ex: 'Make the opening stronger'"
                        className="w-full pl-3 pr-10 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none h-[80px]"
                        disabled={!currentContent || loading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleRefine();
                            }
                        }}
                    />
                    <button
                        onClick={handleRefine}
                        disabled={!instruction || !currentContent || loading}
                        className="absolute right-2 bottom-2 p-1.5 bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
