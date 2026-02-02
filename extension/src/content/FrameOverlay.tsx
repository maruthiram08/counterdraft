import { useState, useEffect } from 'react';

export function FrameOverlay() {
    const [isActive, setIsActive] = useState(false);
    const [highlight, setHighlight] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);

    useEffect(() => {
        const listener = (msg: any, _sender: any, sendResponse: any) => {
            if (msg.type === 'ACTIVATE_FRAME') {
                setIsActive(true);
                document.body.style.cursor = 'crosshair';
                sendResponse({ status: 'active' });
                return true;
            }
            return false;
        };
        chrome.runtime.onMessage.addListener(listener);

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isActive) {
                cleanup();
            }
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
            chrome.runtime.onMessage.removeListener(listener);
            document.removeEventListener('keydown', handleEscape);
            cleanup();
        };
    }, []);

    const cleanup = () => {
        setIsActive(false);
        setHighlight(null);
        document.body.style.cursor = 'default';
        window.removeEventListener('mouseover', handleHover, true);
        window.removeEventListener('click', handleClick, true);
    };

    const handleHover = (e: MouseEvent) => {
        if (!isActive) return;
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();

        setHighlight({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        });
    };

    const handleClick = (e: MouseEvent) => {
        if (!isActive) return;
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();

        // Capture logic
        const captureUrl = window.location.href;
        console.log("[FrameOverlay] Capturing URL:", captureUrl);

        chrome.runtime.sendMessage({
            type: 'SNIP_COMPLETED', // Route through background for consistency
            payload: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                deviceScaleFactor: window.devicePixelRatio,
                pageUrl: captureUrl,
                pageTitle: document.title
            }
        });

        cleanup();
    };

    // Attach DOM listeners when active
    useEffect(() => {
        if (isActive) {
            window.addEventListener('mouseover', handleHover, true);
            window.addEventListener('click', handleClick, true);
        } else {
            window.removeEventListener('mouseover', handleHover, true);
            window.removeEventListener('click', handleClick, true);
        }
        return () => {
            window.removeEventListener('mouseover', handleHover, true);
            window.removeEventListener('click', handleClick, true);
        };
    }, [isActive]);

    if (!isActive) return null;

    return (
        <>
            {/* Highlight Box */}
            {highlight && (
                <div
                    style={{
                        position: 'fixed',
                        top: highlight.top,
                        left: highlight.left,
                        width: highlight.width,
                        height: highlight.height,
                        border: '2px solid #3b82f6', // Blue for Frame Mode
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        pointerEvents: 'none', // Let clicks pass through to the document listener
                        zIndex: 2147483647
                    }}
                />
            )}

            {/* Helper Text */}
            <div style={{
                position: 'fixed',
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
                zIndex: 2147483648,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                Select an element • ESC to cancel
            </div>
        </>
    );

}
