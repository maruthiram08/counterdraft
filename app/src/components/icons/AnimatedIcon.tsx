"use client";

import { useEffect, useRef } from "react";
import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from "react";
import { LazyMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedIconHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

export type AnimatedIconComponent = ForwardRefExoticComponent<
    HTMLAttributes<HTMLDivElement> & { size?: number } & RefAttributes<AnimatedIconHandle>
>;

interface AnimatedIconProps {
    icon: AnimatedIconComponent;
    size?: number;
    className?: string;
    /**
     * hover: plays while the surrounding button/link is hovered or focused.
     * mount: plays once when the icon appears.
     */
    trigger?: "hover" | "mount";
    /** Plays once whenever this changes to a truthy value, e.g. when a tab becomes active. */
    play?: unknown;
}

// Animation should follow the pointer over the whole control, not just the 14px glyph.
const HOST_SELECTOR = "button, a, [role='button'], [data-animated-icon-host]";
const ONE_SHOT_MS = 1200;

// The icons render as plain SVG straight away; the animation engine follows in its own chunk.
const loadAnimationFeatures = () => import("motion/react").then(mod => mod.domAnimation);

function prefersReducedMotion() {
    return typeof window !== "undefined"
        && typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Renders a lucide-animated icon and drives it from its host control,
 * so call sites stay a one-line swap for the static lucide-react icon.
 * Never loops, and stays still for people who prefer reduced motion.
 */
export function AnimatedIcon({ icon: Icon, size = 16, className, trigger = "hover", play }: AnimatedIconProps) {
    const anchorRef = useRef<HTMLSpanElement>(null);
    const iconRef = useRef<AnimatedIconHandle>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPlay = useRef(play);

    const start = () => {
        if (prefersReducedMotion()) return;
        iconRef.current?.startAnimation();
    };
    const stop = () => iconRef.current?.stopAnimation();
    const playOnce = () => {
        if (timer.current) clearTimeout(timer.current);
        start();
        timer.current = setTimeout(stop, ONE_SHOT_MS);
    };

    useEffect(() => {
        if (trigger === "mount") playOnce();
        if (trigger !== "hover") return;
        const anchor = anchorRef.current;
        const host = anchor?.parentElement?.closest<HTMLElement>(HOST_SELECTOR) ?? anchor?.parentElement;
        if (!host) return;
        host.addEventListener("mouseenter", start);
        host.addEventListener("mouseleave", stop);
        host.addEventListener("focusin", start);
        host.addEventListener("focusout", stop);
        return () => {
            host.removeEventListener("mouseenter", start);
            host.removeEventListener("mouseleave", stop);
            host.removeEventListener("focusin", start);
            host.removeEventListener("focusout", stop);
        };
        // start/stop only read refs, so binding once per trigger is enough.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger]);

    useEffect(() => {
        if (Object.is(lastPlay.current, play)) return;
        lastPlay.current = play;
        if (play) playOnce();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [play]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    return (
        <LazyMotion features={loadAnimationFeatures} strict>
            <span ref={anchorRef} className="contents">
                <Icon
                    ref={iconRef}
                    size={size}
                    aria-hidden="true"
                    className={cn("inline-flex shrink-0 items-center justify-center", className)}
                />
            </span>
        </LazyMotion>
    );
}
