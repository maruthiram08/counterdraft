import { useState, useEffect } from 'react';

interface Selection {
    startX: number;
    startY: number;
    width: number;
    height: number;
}

const preventEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Do not preventDefault on mousedown/move if we want to drag, 
    // but we can prevent text selection via CSS. 
    // Actually, preventDefault is good to stop native drag/select.
    e.preventDefault();
};

export function Overlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selection, setSelection] = useState<Selection | null>(null);

    useEffect(() => {
        // Listen for activation command
        const listener = (msg: any, _sender: any, sendResponse: any) => {
            if (msg.type === 'ACTIVATE_SNIP') {
                setIsVisible(true);
                document.body.style.cursor = 'crosshair';
                window.focus(); // Ensure ESC listener catches events
                sendResponse({ status: 'active' });
                return true; // Keep channel open for sendResponse
            }
            // Do not return true for unhandled messages
            return false;
        };
        chrome.runtime.onMessage.addListener(listener);

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsVisible(false);
                setSelection(null);
                document.body.style.cursor = 'default';
            }
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
            chrome.runtime.onMessage.removeListener(listener);
            document.removeEventListener('keydown', handleEscape);
        }
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        preventEvent(e);
        if (!isVisible) return;
        setIsDragging(true);
        setSelection({
            startX: e.clientX,
            startY: e.clientY,
            width: 0,
            height: 0
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selection) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        setSelection({
            ...selection,
            width: currentX - selection.startX,
            height: currentY - selection.startY
        });
    };

    const handleMouseUp = () => {
        if (!isDragging || !selection) return;
        setIsDragging(false);
        setIsVisible(false);
        document.body.style.cursor = 'default';

        // Normalize negative width/height (dragging left/up)
        const finalSelection = {
            x: selection.width > 0 ? selection.startX : selection.startX + selection.width,
            y: selection.height > 0 ? selection.startY : selection.startY + selection.height,
            width: Math.abs(selection.width),
            height: Math.abs(selection.height),
            deviceScaleFactor: window.devicePixelRatio
        };

        // Don't capture tiny clicks
        if (finalSelection.width > 5 && finalSelection.height > 5) {
            chrome.runtime.sendMessage({
                type: 'SNIP_COMPLETED',
                payload: {
                    ...finalSelection,
                    pageUrl: window.location.href,
                    pageTitle: document.title
                }
            });
        }

        setSelection(null);
    };

    useEffect(() => {
        if (isVisible) {
            // Force focus to capture ESC key - use setTimeout to ensure DOM is ready
            setTimeout(() => {
                const el = document.getElementById('counterdraft-overlay');
                el?.focus();
            }, 0);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div
            id="counterdraft-overlay"
            tabIndex={-1} // Make focusable
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483647, // Max Z-Index
                cursor: 'crosshair',
                backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dim the page
                userSelect: 'none',
                outline: 'none' // Remove blue ring
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Selection Box */}
            {selection && (
                <div
                    style={{
                        position: 'absolute',
                        left: selection.width > 0 ? selection.startX : selection.startX + selection.width,
                        top: selection.height > 0 ? selection.startY : selection.startY + selection.height,
                        width: Math.abs(selection.width),
                        height: Math.abs(selection.height),
                        border: '2px solid #16a34a', // CounterDraft Green
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' // Spotlight effect
                    }}
                />
            )}

            <div style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1f2937',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                pointerEvents: 'none',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                Drag to Snip
            </div>

            {/* Explicit Cancel Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsVisible(false);
                    setSelection(null);
                    document.body.style.cursor = 'default';
                }}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    pointerEvents: 'auto', // override parent userSelect
                    zIndex: 2147483648
                }}
            >
                Cancel (ESC)
            </button>
        </div>
    );
}
