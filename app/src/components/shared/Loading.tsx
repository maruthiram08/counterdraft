import { Loader2 } from "lucide-react";

// The one loading system for the app (see docs/design-system.md, "Loading").
//
// - Spinner: the only spinning mark. Inside a button it replaces the button's icon
//   at the same size and takes the button's text colour.
// - Loader: a block that is loading with no known shape (a page gate, a panel, a modal body).
//   Ember spinner, optional one-line label underneath.
// - Skeleton: grey blocks for content whose shape is known (lists, cards, rows).
// - The thin ember top bar (NavProgress) covers moving between pages.

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
    return <Loader2 size={size} aria-hidden="true" className={`shrink-0 animate-spin ${className}`} />;
}

interface LoaderProps {
    // What is happening, in a few words ("Loading your beliefs", "Writing your draft").
    label?: string;
    // Optional second line for long AI work.
    hint?: string;
    // Fills the screen (route gates, Suspense fallbacks).
    fullScreen?: boolean;
    // Sits in a pressed tray (AI work inside the writing wizard).
    tray?: boolean;
    className?: string;
}

export function Loader({ label, hint, fullScreen, tray, className = "" }: LoaderProps) {
    const box = fullScreen
        ? "h-dvh bg-canvas"
        : tray
            ? "py-10 md:py-12 bg-canvas shadow-pressed rounded-card"
            : "py-16";
    return (
        <div role="status" className={`flex flex-col items-center justify-center gap-3 px-6 text-center ${box} ${className}`}>
            <Spinner size={24} className="text-ember-500" />
            {label ? <p className="text-sm text-ink-muted">{label}</p> : <span className="sr-only">Loading</span>}
            {hint && <p className="-mt-2 text-xs text-ink-muted">{hint}</p>}
        </div>
    );
}

// A grey placeholder block. Size and shape come from className (h-4 w-2/3, w-16 h-16 rounded-full...).
export function Skeleton({ className = "" }: { className?: string }) {
    return <div aria-hidden="true" className={`bg-surface-muted rounded-full animate-pulse ${className}`} />;
}
