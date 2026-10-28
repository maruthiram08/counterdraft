"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const START = "nav-progress-start";

// router.push for taps that open another page: starts the bar first, since the page can take a moment
export function useNavigate() {
    const router = useRouter();
    return useCallback((href: string) => {
        if (new URL(href, location.href).pathname !== location.pathname) window.dispatchEvent(new Event(START));
        router.push(href);
    }, [router]);
}

// A thin ember bar that starts the moment a link is tapped, so a page that takes a
// second to arrive never looks like a missed tap. It finishes when the new page renders.
export function NavProgress() {
    const pathname = usePathname();
    // The page the tap left from; null when no navigation is under way
    const [leftFrom, setLeftFrom] = useState<string | null>(null);
    const arrived = leftFrom !== null && leftFrom !== pathname;

    useEffect(() => {
        // iOS Safari only shows :active (the pressed look) when a touchstart listener exists
        const noop = () => {};
        document.addEventListener("touchstart", noop, { passive: true });

        const onClick = (e: MouseEvent) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
            const url = new URL(link.href, location.href);
            if (url.origin !== location.origin || url.pathname === location.pathname) return;
            setLeftFrom(location.pathname);
        };
        const onStart = () => setLeftFrom(location.pathname);
        document.addEventListener("click", onClick, true);
        window.addEventListener(START, onStart);
        return () => {
            document.removeEventListener("touchstart", noop);
            document.removeEventListener("click", onClick, true);
            window.removeEventListener(START, onStart);
        };
    }, []);

    // Fade out once the page is here; give up after 10s so a cancelled tap never leaves it running
    useEffect(() => {
        if (leftFrom === null) return;
        const t = setTimeout(() => setLeftFrom(null), arrived ? 300 : 10000);
        return () => clearTimeout(t);
    }, [leftFrom, arrived]);

    if (leftFrom === null) return null;
    return (
        <div aria-hidden className="fixed inset-x-0 top-0 z-[9999] h-[3px] pointer-events-none">
            <div
                className={`h-full bg-ember-500 ${arrived ? "w-full opacity-0 transition-opacity duration-300" : "nav-progress-run"}`}
            />
        </div>
    );
}
