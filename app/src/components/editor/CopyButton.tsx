"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
    label: string;
    // Resolves false when the browser refused to copy
    onCopy: () => Promise<boolean>;
    // An accessible name when the visible label alone is ambiguous ("Copy" on every post)
    ariaLabel?: string;
    primary?: boolean;
    className?: string;
}

// A copy button that says "Copied" for a moment, and says so when copying failed.
export function CopyButton({ label, onCopy, ariaLabel, primary, className = '' }: CopyButtonProps) {
    const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

    const handle = async () => {
        const ok = await onCopy();
        setState(ok ? 'copied' : 'failed');
        setTimeout(() => setState('idle'), 2000);
    };

    return (
        <button
            type="button"
            onClick={handle}
            aria-label={ariaLabel}
            className={`shrink-0 h-11 md:h-9 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 active:shadow-pressed transition-all ${primary
                ? 'bg-ember-500 text-white hover:bg-ember-600 shadow-ember'
                : 'bg-canvas text-ink shadow-raised hover:text-ember-600'} ${className}`}
        >
            {state === 'copied' ? <Check size={14} className={primary ? 'text-white' : 'text-sage-700'} /> : <Copy size={14} />}
            <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? "Couldn't copy" : label}</span>
        </button>
    );
}
