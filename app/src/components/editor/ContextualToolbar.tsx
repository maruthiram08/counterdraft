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
        }
    };

    return (
        <div
            className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
            style={style}
            onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus
        >
            <div className="flex items-center p-1">
                {loading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)]">
                        <Sparkles size={14} className="animate-spin text-[var(--accent)]" />
                        Refining...
                    </div>
                ) : mode === 'options' ? (
                    <>
                        <button
                            onClick={() => onOptionSelect("Improve writing")}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 transition-colors"
                        >
                            <Sparkles size={14} className="text-[var(--accent)]" />
                            Improve
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button
                            onClick={() => onOptionSelect("Make shorter")}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 transition-colors"
                            title="Make shorter"
                        >
                            <Eraser size={14} />
                        </button>
                        <button
                            onClick={() => onOptionSelect("Fix grammar")}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 transition-colors"
                            title="Fix grammar"
                        >
                            <Type size={14} />
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button
                            onClick={() => setMode('input')}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 transition-colors"
                        >
                            <Wand2 size={14} />
                            Ask AI...
                        </button>
                    </>
                ) : (
                    <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 p-1">
                        <button
                            type="button"
                            onClick={() => setMode('options')}
                            className="p-1 hover:bg-gray-100 rounded-md text-gray-400"
                        >
                            <X size={14} />
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="How should we change this?"
                            className="w-64 text-sm outline-none bg-transparent placeholder:text-gray-400"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                        <button
                            type="submit"
                            className="p-1.5 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity"
                        >
                            <ArrowRight size={14} />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
