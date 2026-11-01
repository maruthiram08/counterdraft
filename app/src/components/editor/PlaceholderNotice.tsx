"use client";

import { PenLine, Sparkles } from "lucide-react";
import { Placeholder } from "@/lib/editor/placeholders";
import { Spinner } from "@/components/shared/Loading";

interface PlaceholderNoticeProps {
    placeholders: Placeholder[];
    onJump: (placeholder: Placeholder) => void;
    onFill?: () => void; // write a suggestion into each spot instead of leaving it to the creator
    filling?: boolean;
}

// The draft left spots only the creator can fill. Named up front, each one a click away.
export function PlaceholderNotice({ placeholders, onJump, onFill, filling }: PlaceholderNoticeProps) {
    if (!placeholders.length) return null;
    const count = placeholders.length;

    return (
        <div role="status" className="rounded-tile bg-ember-50 shadow-[inset_0_0_0_1.5px_var(--color-ember-200)] px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-ember-700">
                <PenLine size={14} />
                {count === 1 ? '1 spot needs your own words before you post' : `${count} spots need your own words before you post`}
            </p>
            <ul className="mt-2 space-y-1.5">
                {placeholders.map(p => (
                    <li key={`${p.index}-${p.start}`} className="flex items-start gap-3 text-sm">
                        <span className="flex-1 min-w-0 text-ink-soft">{p.label}</span>
                        <button
                            onClick={() => onJump(p)}
                            className="shrink-0 h-7 px-3 rounded-full bg-surface shadow-raised text-xs font-medium text-ember-700 hover:text-ember-600 active:shadow-pressed transition-all"
                        >
                            Go to it
                        </button>
                    </li>
                ))}
            </ul>
            {onFill && (
                <button
                    onClick={onFill}
                    disabled={filling}
                    className="mt-3 flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface shadow-raised text-xs font-medium text-ember-700 hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                >
                    {filling ? <Spinner size={12} /> : <Sparkles size={12} />}
                    Suggest something for {count === 1 ? 'it' : 'these'}
                </button>
            )}
        </div>
    );
}
