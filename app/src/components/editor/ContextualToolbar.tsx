"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Eraser } from "lucide-react";

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
    // Auto-focus input on mount
    useEffect(() => {
        // Robust focus strategy:
        // 1. Immediate try
        // 2. Short timeout
        // 3. RAF for next paint
        const attemptFocus = () => {
            if (inputRef.current) {
                inputRef.current.focus({ preventScroll: true });
            }
        };

        attemptFocus();
        const t1 = setTimeout(attemptFocus, 50);
        const raf = requestAnimationFrame(() => {
            attemptFocus();
        });

        return () => {
            clearTimeout(t1);
            cancelAnimationFrame(raf);
        };
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
                    <form onSubmit={handleCustomSubmit} className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask AI to refine selection..."
                            className="w-full text-[15px] font-medium outline-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all shadow-sm"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </form>

                    {/* Bottom: Quick Actions */}
                    <div className="p-2 bg-white">
                        <div className="px-2 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider select-none flex items-center justify-between">
                            <span>Actions</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => onOptionSelect("Remove AI-isms and corporate jargon, make it human and direct")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 rounded-lg text-[15px] text-gray-700 hover:text-orange-600 transition-colors text-left group"
                            >
                                <Sparkles size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                                <span className="font-medium">Remove AI-isms</span>
                            </button>
                            <button
                                onClick={() => onOptionSelect("Rephrase this clearly and effectively")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-[15px] text-gray-700 transition-colors text-left group"
                            >
                                <Sparkles size={16} className="text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
                                <span className="font-medium">Rephrase</span>
                            </button>
                            <button
                                onClick={() => onOptionSelect("Delete this selection")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-lg text-[15px] text-gray-700 hover:text-red-600 transition-colors text-left group"
                            >
                                <Eraser size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                                <span className="font-medium">Delete</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
