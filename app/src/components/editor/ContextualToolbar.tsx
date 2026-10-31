"use client";

import { useState, useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { SparklesIcon } from "@/components/icons/animated";
import { Spinner } from "@/components/shared/Loading";

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
            className="fixed z-50 bg-surface rounded-tile shadow-float animate-in fade-in zoom-in-95 duration-200 flex flex-col w-[320px] overflow-hidden font-sans"
            style={style}
            onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus
        >
            {loading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-ink-muted">
                    <Spinner size={16} className="text-ember-500" />
                    <span className="font-medium">Refining selection...</span>
                </div>
            ) : (
                <>
                    {/* Top: Large Input Area */}
                    <form onSubmit={handleCustomSubmit} className="p-3 pb-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask AI to refine selection..."
                            className="w-full text-[15px] bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </form>

                    {/* Bottom: Quick Actions */}
                    <div className="p-2 pt-1">
                        <div className="px-2 py-1.5 text-sm text-ink-muted select-none flex items-center justify-between">
                            <span>Actions</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => onOptionSelect("Remove AI-isms and corporate jargon, make it human and direct")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-ember-50 rounded-2xl text-[15px] text-ink-soft hover:text-ember-700 transition-colors text-left group"
                            >
                                <AnimatedIcon icon={SparklesIcon} size={16} className="text-ink-muted group-hover:text-ember-500 transition-colors" />
                                <span className="font-medium">Remove AI-isms</span>
                            </button>
                            <button
                                onClick={() => onOptionSelect("Rephrase this clearly and effectively")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted rounded-2xl text-[15px] text-ink-soft hover:text-ink transition-colors text-left group"
                            >
                                <AnimatedIcon icon={SparklesIcon} size={16} className="text-ink-muted group-hover:text-ember-500 transition-colors" />
                                <span className="font-medium">Rephrase</span>
                            </button>
                            <button
                                onClick={() => onOptionSelect("Delete this selection")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-100 rounded-2xl text-[15px] text-ink-soft hover:text-rose-700 transition-colors text-left group"
                            >
                                <Eraser size={16} className="text-ink-muted group-hover:text-rose-500 transition-colors" />
                                <span className="font-medium">Delete</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
