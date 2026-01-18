"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Type, Eraser } from "lucide-react";

interface ContextualToolbarProps {
    position: { top: number; left: number } | null;
    onOptionSelect: (option: string) => void;
    onCustomInput: (input: string) => void;
    onClose: () => void;
    loading?: boolean;
}

export function ContextualToolbar({ position, onOptionSelect, onCustomInput, onClose, loading = false }: ContextualToolbarProps) {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    if (!position) return null;

    // Calculate position style
    const style: React.CSSProperties = {
        top: position.top - 10,
        left: position.left,
        transform: 'translateY(-100%)',
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onCustomInput(inputValue);
            setInputValue("");
        }
    };

    return (
        <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col w-[320px] overflow-hidden font-sans"
            style={style}
            onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus
        >
            {loading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-[var(--text-muted)]">
                    <Sparkles size={16} className="animate-spin text-[var(--accent)]" />
                    <span className="font-medium">Refining selection...</span>
                </div>
            ) : (
                <>
                    {/* Top: Large Input Area */}
                    <form onSubmit={handleCustomSubmit} className="p-3 border-b border-gray-50 bg-gray-50/50">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Describe your change..."
                            className="w-full text-base outline-none bg-transparent placeholder:text-gray-400 text-gray-800"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </form>

                    {/* Bottom: Quick Actions */}
                    <div className="p-2 bg-white">
                        <div className="px-2 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider select-none">
                            Rephrase with
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <button
                                onClick={() => onOptionSelect("Improve writing")}
                                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors text-left group"
                            >
                                <Sparkles size={14} className="text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
                                <span className="font-medium">Improve writing</span>
                            </button>
                            <button
                                onClick={() => onOptionSelect("Make shorter")}
                                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors text-left group"
                            >
                                <Eraser size={14} className="text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
                                <span className="font-medium">Make shorter</span>
                            </button>
                            <button
                                onClick={() => onOptionSelect("Fix grammar")}
                                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors text-left group"
                            >
                                <Type size={14} className="text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
                                <span className="font-medium">Fix grammar</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
