"use client";

import { Sparkles } from "lucide-react";
import type { Suggestion } from "@/lib/editor/suggestions";

interface SuggestionNoticeProps {
    suggestions: Suggestion[];
    onJump: (suggestion: Suggestion) => void;
    onKeep: (suggestion: Suggestion) => void;
}

// Where the draft needed a detail nobody gave, it wrote one. Each is a click away, to check, rewrite or keep.
export function SuggestionNotice({ suggestions, onJump, onKeep }: SuggestionNoticeProps) {
    if (!suggestions.length) return null;
    const count = suggestions.length;

    return (
        <div role="status" className="rounded-tile bg-dusk-100/60 shadow-[inset_0_0_0_1.5px_var(--color-dusk-100)] px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-dusk-700">
                <Sparkles size={14} />
                {count === 1 ? 'I suggested 1 detail for you' : `I suggested ${count} details for you`}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">Swap in your own if you have one, or keep mine. Remembered something? Add it under Your notes.</p>
            <ul className="mt-2 space-y-1.5">
                {suggestions.map(s => (
                    <li key={`${s.index}-${s.start}`} className="flex items-start gap-2 text-sm">
                        <span className="flex-1 min-w-0 text-ink-soft line-clamp-2">{s.text}</span>
                        <button
                            onClick={() => onJump(s)}
                            className="shrink-0 h-7 px-3 rounded-full bg-surface shadow-raised text-xs font-medium text-dusk-700 hover:text-ink active:shadow-pressed transition-all"
                        >
                            Go to it
                        </button>
                        <button
                            onClick={() => onKeep(s)}
                            className="shrink-0 h-7 px-3 rounded-full text-xs font-medium text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                        >
                            Keep
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
