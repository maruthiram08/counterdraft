"use client";

import { useState, useRef } from "react";
import { Sparkles, X, ChevronUp } from "lucide-react";

interface MobileAgentSheetProps {
    children: React.ReactNode;
}

type SheetState = 'collapsed' | 'half' | 'full';

export function MobileAgentSheet({ children }: MobileAgentSheetProps) {
    const [sheetState, setSheetState] = useState<SheetState>('collapsed');
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Collapsed shows the pill instead of the sheet
    const heights: Record<Exclude<SheetState, 'collapsed'>, string> = {
        half: '50vh',
        full: 'calc(100dvh - 120px)'
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;

        const currentY = e.touches[0].clientY;
        const diff = startY - currentY;

        // Determine new state based on drag direction and distance
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                // Dragging up
                if (sheetState === 'collapsed') setSheetState('half');
                else if (sheetState === 'half') setSheetState('full');
            } else {
                // Dragging down
                if (sheetState === 'full') setSheetState('half');
                else if (sheetState === 'half') setSheetState('collapsed');
            }
            setStartY(currentY);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleClose = () => {
        setSheetState('collapsed');
    };

    return (
        <>
            {/* Backdrop when expanded */}
            {sheetState !== 'collapsed' && (
                <div
                    className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={handleClose}
                />
            )}

            {/* Collapsed: a pill above the bottom nav, so it never covers the nav or the text */}
            {sheetState === 'collapsed' && (
                <button
                    onClick={() => setSheetState('half')}
                    className="fixed right-4 bottom-[104px] z-30 h-11 pl-3.5 pr-4 rounded-full bg-canvas shadow-float text-ink text-sm font-medium flex items-center gap-2 active:shadow-pressed transition-all"
                >
                    <Sparkles size={16} className="text-ember-500" />
                    AI Agent
                    <ChevronUp size={16} className="opacity-50" />
                </button>
            )}

            {/* Bottom Sheet */}
            {sheetState !== 'collapsed' && <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-50 bg-canvas rounded-t-card shadow-float transition-all duration-300 ease-out ${isDragging ? 'transition-none' : ''
                    }`}
                style={{ height: heights[sheetState] }}
            >
                {/* Handle Bar */}
                <div
                    className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-10 h-1 bg-ink-muted/40 rounded-full mb-2" />
                    <div className="w-full flex items-center justify-between px-4 py-1">
                        <div className="flex items-center gap-2 text-ink font-medium tracking-[-0.01em]">
                            <Sparkles size={18} className="text-ember-500" />
                            <span>AI Agent</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleClose(); }}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto h-[calc(100%-60px)]">
                    {children}
                </div>
            </div>}
        </>
    );
}
