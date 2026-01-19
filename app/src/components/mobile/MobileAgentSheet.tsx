"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, ChevronUp, GripHorizontal } from "lucide-react";

interface MobileAgentSheetProps {
    children: React.ReactNode;
}

type SheetState = 'collapsed' | 'half' | 'full';

export function MobileAgentSheet({ children }: MobileAgentSheetProps) {
    const [sheetState, setSheetState] = useState<SheetState>('collapsed');
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const sheetRef = useRef<HTMLDivElement>(null);

    const heights = {
        collapsed: '56px',
        half: '50vh',
        full: 'calc(100vh - 120px)'
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

    const handleClick = () => {
        if (sheetState === 'collapsed') {
            setSheetState('half');
        }
    };

    const handleClose = () => {
        setSheetState('collapsed');
    };

    return (
        <>
            {/* Backdrop when expanded */}
            {sheetState !== 'collapsed' && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
                    onClick={handleClose}
                />
            )}

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-all duration-300 ease-out ${isDragging ? 'transition-none' : ''
                    }`}
                style={{
                    height: heights[sheetState],
                    marginBottom: sheetState === 'collapsed' ? '64px' : '0' // Account for bottom nav
                }}
            >
                {/* Handle Bar */}
                <div
                    className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={handleClick}
                >
                    <div className="w-10 h-1 bg-gray-300 rounded-full mb-2" />

                    {sheetState === 'collapsed' ? (
                        <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm py-1">
                            <Sparkles size={16} />
                            <span>AI Agent</span>
                            <ChevronUp size={16} className="opacity-50" />
                        </div>
                    ) : (
                        <div className="w-full flex items-center justify-between px-4 py-1">
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <Sparkles size={18} className="text-indigo-500" />
                                <span>AI Agent</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                {sheetState !== 'collapsed' && (
                    <div className="flex-1 overflow-y-auto h-[calc(100%-60px)]">
                        {children}
                    </div>
                )}
            </div>
        </>
    );
}
