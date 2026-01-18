"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, X, Wand2, Type, Eraser } from "lucide-react";

interface ContextualToolbarProps {
    position: { top: number; left: number } | null;
    onOptionSelect: (option: string) => void;
    onCustomInput: (input: string) => void;
    onClose: () => void;
    loading?: boolean;
}

export function ContextualToolbar({ position, onOptionSelect, onCustomInput, onClose, loading = false }: ContextualToolbarProps) {
    const [mode, setMode] = useState<'options' | 'input'>('options');
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when switching modes
    useEffect(() => {
        if (mode === 'input' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [mode]);

    if (!position) return null;

    // Calculate position style
    // We offset slightly to place it above the selection
    const style: React.CSSProperties = {
        top: position.top - 10,  // 10px buffer above line
        left: position.left,
        transform: 'translateY(-100%)', // Anchor bottom-left to top-left of selection
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onCustomInput(inputValue);
            setInputValue(""); // Clear after submit
        }
    };

    return (
        <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 flex items-center p-1.5 gap-1"
            style={style}
            onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus
        >
            {loading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)]">
                    <Sparkles size={14} className="animate-spin text-[var(--accent)]" />
                    Refining...
                </div>
            ) : (
                <>
                    <button
                        onClick={() => onOptionSelect("Improve writing")}
                        className="px-3 py-1.5 hover:bg-gray-50 rounded-md text-sm font-medium text-gray-700 transition-colors whitespace-nowrap"
                    >
                        Improve
                    </button>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <button
                        onClick={() => onOptionSelect("Make shorter")}
                        className="px-3 py-1.5 hover:bg-gray-50 rounded-md text-sm font-medium text-gray-700 transition-colors whitespace-nowrap"
                    >
                        Shorten
                    </button>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <button
                        onClick={() => onOptionSelect("Fix grammar")}
                        className="px-3 py-1.5 hover:bg-gray-50 rounded-md text-sm font-medium text-gray-700 transition-colors whitespace-nowrap"
                    >
                        Fix Grammar
                    </button>
                    <div className="w-px h-4 bg-gray-200"></div>

                    {/* Embedded Input */}
                    <form onSubmit={handleCustomSubmit} className="flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask AI..."
                            className="w-40 px-2 py-1.5 text-sm outline-none bg-transparent placeholder:text-gray-400 focus:placeholder:text-gray-300"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="p-1 hover:bg-gray-100 rounded-md text-[var(--accent)] disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                        >
                            <ArrowRight size={14} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
