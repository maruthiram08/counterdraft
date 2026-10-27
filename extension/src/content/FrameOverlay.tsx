import { useState, useEffect } from 'react';
import { captureElement } from './captureElement';

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

        return () => {
            chrome.runtime.onMessage.removeListener(listener);
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

    const handleClick = async (e: MouseEvent) => {
        if (!isActive) return;
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const basePayload = {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            deviceScaleFactor: window.devicePixelRatio,
            pageUrl: window.location.href,
            pageTitle: document.title
        };

        cleanup();

        try {
            chrome.runtime.sendMessage({ type: 'FRAME_CAPTURE_PROGRESS', payload: { done: 0, total: 1 } });
            const capture = await captureElement(target, (done, total) => {
                chrome.runtime.sendMessage({ type: 'FRAME_CAPTURE_PROGRESS', payload: { done, total } });
            });
            chrome.runtime.sendMessage({
                type: 'SNIP_COMPLETED', // Route through background for consistency
                payload: {
                    ...basePayload,
                    width: capture.width,
                    height: capture.height,
                    tiles: capture.tiles,
                    truncated: capture.truncated,
                    pageText: capture.text
                }
            });
        } catch (err) {
            // Fall back to the visible part only, as before
            console.error("[CounterDraft] Full element capture failed:", err);
            chrome.runtime.sendMessage({ type: 'SNIP_COMPLETED', payload: basePayload });
        }
    };

    // Attach DOM listeners when active (re-bound on each change so handlers see the current isActive)
    useEffect(() => {
        if (!isActive) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cleanup();
        };
        window.addEventListener('mouseover', handleHover, true);
        window.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('mouseover', handleHover, true);
            window.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleEscape);
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
