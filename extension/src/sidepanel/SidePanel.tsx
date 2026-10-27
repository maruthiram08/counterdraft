import { useState, useEffect } from 'react';
import { Camera, Scissors, MapPin, X, Check } from 'lucide-react';

// The CounterDraft app this extension saves captures to. Set VITE_APP_URL at build time
// (e.g. VITE_APP_URL=https://counterdraft.com npm run build); defaults to local dev.
const APP_URL = (import.meta.env.VITE_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

interface SnipData {
    dataUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    deviceScaleFactor: number;
    pageTitle: string;
    pageUrl: string;
    pageText?: string;
    truncated?: boolean;
}

// One screenful of a Frame capture, cut out of a viewport screenshot (CSS pixels)
interface CaptureTile {
    dataUrl: string;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    dx: number;
    dy: number;
    viewportWidth: number;
}

// Vercel rejects request bodies over 4.5 MB, so keep the image well under that
const MAX_IMAGE_CHARS = 3_000_000;

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the screenshot'));
    img.src = src;
});

// PNG keeps text sharpest; tall captures fall back to JPEG, then to a smaller size
const encodeCanvas = (canvas: HTMLCanvasElement): string => {
    const png = canvas.toDataURL('image/png');
    if (png.length <= MAX_IMAGE_CHARS) return png;
    let source = canvas;
    for (let i = 0; i < 4; i++) {
        const jpeg = source.toDataURL('image/jpeg', 0.85);
        if (jpeg.length <= MAX_IMAGE_CHARS) return jpeg;
        const smaller = document.createElement('canvas');
        smaller.width = Math.round(source.width * 0.75);
        smaller.height = Math.round(source.height * 0.75);
        smaller.getContext('2d')?.drawImage(source, 0, 0, smaller.width, smaller.height);
        source = smaller;
    }
    return source.toDataURL('image/jpeg', 0.7);
};

const stitchTiles = async (tiles: CaptureTile[], width: number, height: number): Promise<string> => {
    const images = await Promise.all(tiles.map(tile => loadImage(tile.dataUrl)));
    // Screenshot pixels per CSS pixel (devicePixelRatio and zoom), read from the screenshot itself
    const scale = images[0].naturalWidth / tiles[0].viewportWidth;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    tiles.forEach((tile, i) => {
        const s = images[i].naturalWidth / tile.viewportWidth;
        ctx.drawImage(
            images[i],
            tile.sx * s, tile.sy * s, tile.sw * s, tile.sh * s,
            Math.round(tile.dx * scale), Math.round(tile.dy * scale), tile.sw * scale, tile.sh * scale
        );
    });
    return encodeCanvas(canvas);
};

export function SidePanel() {
    const [status, setStatus] = useState<string>("Idle");
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [snipData, setSnipData] = useState<SnipData | null>(null);
    const [userNote, setUserNote] = useState("");
    const [userIntent, setUserIntent] = useState<'agree' | 'counter' | 'evidence' | 'framing' | 'example' | null>(null);
    // State Preservation: Store the target tab when we initiate an action to ensure we don't lose the URL
    const [targetTab, setTargetTab] = useState<{ id: number; url: string; title: string } | null>(null);

    // --- Message Listener ---
    useEffect(() => {
        const handleMessage = async (msg: any) => {
            if (msg.type === 'FRAME_CAPTURE_PROGRESS') {
                setProgress(msg.payload);
                setStatus("Processing...");
                return;
            }
            if (msg.type === 'PROCESS_SNIP') {
                setStatus("Processing...");

                // --- URL SAFETY NET ---
                // Priority 1: Data from Background (via chrome.tabs.get)
                // Priority 2: Data from SidePanel State (captured at activation)
                // Priority 3: Fallback query again

                let finalPageUrl = msg.payload.pageUrl || targetTab?.url;
                let finalPageTitle = msg.payload.pageTitle || targetTab?.title;

                if (!finalPageUrl) {
                    try {
                        console.log("URL missing in payload & state, invoking backup capture (Bookmark method)...");
                        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                        const tab = tabs[0];
                        if (tab) {
                            finalPageUrl = tab.url || "";
                            finalPageTitle = tab.title || "Unknown Page";
                            console.log("Restored URL from backup:", finalPageUrl);
                        }
                    } catch (err) {
                        console.error("Backup URL capture failed:", err);
                    }
                }

                console.log("Processing snip with URL:", finalPageUrl);

                let croppedUrl: string;
                if (msg.payload.tiles?.length) {
                    // Frame mode: the page already took one screenshot per screenful, join them
                    croppedUrl = await stitchTiles(
                        msg.payload.tiles,
                        msg.payload.width,
                        msg.payload.height
                    );
                } else {
                    // 1. Get the full screenshot first
                    const fullScreenResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
                    const fullScreenshotUrl = fullScreenResponse.dataUrl;

                    // 2. Crop it
                    croppedUrl = await cropImage(
                        fullScreenshotUrl,
                        msg.payload.x,
                        msg.payload.y,
                        msg.payload.width,
                        msg.payload.height,
                        msg.payload.deviceScaleFactor
                    );
                }
                setProgress(null);

                setCapturedImage(croppedUrl);
                const snipFields = { ...msg.payload };
                delete snipFields.tiles; // screenshots are already joined into croppedUrl
                setSnipData({
                    ...snipFields,
                    pageUrl: finalPageUrl,
                    pageTitle: finalPageTitle,
                    dataUrl: croppedUrl
                });
                setStatus("Review");
            }
        };
        // Not async: a listener that returns a promise answers every message, and would beat the
        // background's reply to the page's CAPTURE_VISIBLE_TAB requests with an empty one
        const listener = (msg: any) => {
            handleMessage(msg).catch((err) => {
                console.error("Processing snip failed:", err);
                alert("Capture failed: " + (err?.message || "Unknown error"));
                setProgress(null);
                setStatus("Idle");
            });
            return false;
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    // --- Canvas Cropping Helper ---
    const cropImage = (src: string, x: number, y: number, w: number, h: number, scale: number): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Adjust for retina displays (devicePixelRatio)
                const pixelX = x * scale;
                const pixelY = y * scale;
                const pixelW = w * scale;
                const pixelH = h * scale;

                canvas.width = pixelW;
                canvas.height = pixelH;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);
                    resolve(encodeCanvas(canvas));
                }
            };
            img.src = src;
        });
    };

    const handleSnip = async () => {
        setStatus("Snipping...");
        setCapturedImage(null);

        // Use lastFocusedWindow to avoid getting the side panel's own frame context
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const tab = tabs[0];

        console.log("Targeting Tab:", tab);

        if (tab?.id) {
            if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
                alert("Cannot snip internal browser pages. Please try a real website.");
                setStatus("Idle");
                return;
            }

            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_SNIP' });
            } catch (err) {
                console.error("Failed to send message:", err);
                alert("Could not activate snip. Try reloading the page!");
                setStatus("Idle");
            }
        } else {
            console.error("No active tab found");
            alert("No active tab found to snip.");
            setStatus("Idle");
        }
    };

    const handleFrame = async () => {
        setStatus("Selecting...");
        setCapturedImage(null);
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const tab = tabs[0];
        if (tab?.id) {
            setTargetTab({ id: tab.id, url: tab.url || "", title: tab.title || "" });
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_FRAME' });
            } catch (err: any) {
                console.error("Frame activation failed:", err);

                // Self-Healing: Try to inject the script if it's missing
                if (err.message && err.message.includes("Receiving end does not exist")) {
                    try {
                        setStatus("Injecting...");
                        console.log("Attempting to inject content script...");
                        const manifest = chrome.runtime.getManifest();
                        const scriptFiles = manifest.content_scripts?.[0]?.js;

                        if (scriptFiles && scriptFiles.length > 0) {
                            await chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                files: scriptFiles
                            });
                            // Retry activation after injection
                            setTimeout(async () => {
                                try {
                                    await chrome.tabs.sendMessage(tab.id!, { type: 'ACTIVATE_FRAME' });
                                    setStatus("Selecting..."); // Back to normal
                                } catch (retryErr) {
                                    console.error("Retry failed:", retryErr);
                                    alert("Could not activate Frame mode even after injection. Please reload the page.");
                                    setStatus("Idle");
                                }
                            }, 100);
                            return;
                        }
                    } catch (injectErr) {
                        console.error("Injection failed:", injectErr);
                    }
                }

                alert("Could not activate Frame mode. The page might be restricted or waiting for reload.");
                setStatus("Idle");
            }
        }
    };

    const handleBookmark = async () => {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const tab = tabs[0];
        if (!tab) return;

        setCapturedImage(null); // No image for bookmark
        setSnipData({
            dataUrl: "", // Empty string means "no image"
            x: 0, y: 0, width: 0, height: 0, deviceScaleFactor: 1,
            pageTitle: tab.title || "Unknown Page",
            pageUrl: tab.url || "",
        });
        setStatus("Review");
    };

    const handleSave = async () => {
        if (!snipData || !userIntent) {
            alert("Please select an Intent (Why are you saving this?)");
            return;
        }

        setStatus("Saving...");
        // API logic omitted for brevity in search block, will fail if I don't include full block?
        // Let's just insert the whole function.
        // Helper to get cookie
        const getAuthToken = async () => {
            try {
                const cookie = await chrome.cookies.get({ url: APP_URL, name: '__session' });
                return cookie?.value;
            } catch (e) {
                console.error("Failed to get cookie", e);
                return null;
            }
        };

        const token = await getAuthToken();

        try {
            const API_URL = `${APP_URL}/api/brain/capture`;

            const headers: any = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify({
                    imageBase64: snipData.dataUrl,
                    userNote,
                    intentType: userIntent,
                    sourceUrl: snipData.pageUrl,
                    sourceTitle: snipData.pageTitle,
                    pageTitle: snipData.pageTitle,
                    isBookmark: !snipData.dataUrl,
                    pageText: snipData.pageText || undefined
                })
            });

            if (!response.ok) {
                // The server may answer with plain text (or an HTML error page), so don't assume JSON
                const text = await response.text();
                let message = '';
                try {
                    message = JSON.parse(text).error || '';
                } catch {
                    message = text.trim().startsWith('<') ? '' : text.trim().slice(0, 200);
                }
                if (response.status === 401) {
                    message = message || 'Please log in to CounterDraft and try again.';
                }
                throw new Error(message || `Failed to save (error ${response.status})`);
            }

            setStatus("Success");
            setTimeout(handleReset, 2000);
        } catch (error: any) {
            console.error("Full Save Error:", error);
            // Use specific error message from JSON response if available
            // Note: fetch() throws matching network errors, but we manually throw on !ok
            alert("Save failed: " + (error.message || "Unknown error"));
            setStatus("Review");
        }
    };

    const handleReset = () => {
        setStatus("Idle");
        setCapturedImage(null);
        setSnipData(null);
        setUserNote("");
        setProgress(null);
    };

    if (status === 'Success') {
        return (
            <div className="flex flex-col h-screen bg-green-50 text-green-900 items-center justify-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Check size={32} className="text-green-600" />
                </div>
                <h2 className="text-lg font-bold">Captured!</h2>
                <p className="text-sm text-green-700">Added to your brain.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#16a34a] rounded-full flex items-center justify-center text-white font-bold text-xs">C</div>
                    <h1 className="font-semibold text-sm">CounterDraft Lens</h1>
                </div>
                {status === 'Review' && (
                    <button onClick={handleReset} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">

                {(status === 'Idle' || status === 'Snipping...' || status === 'Saving...' || status === 'Processing...') ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={handleSnip}
                                disabled={status !== 'Idle'}
                                className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-[#16a34a] hover:bg-[#dcfce7] transition gap-2 group shadow-sm disabled:opacity-50"
                            >
                                <Scissors size={20} className="text-[#16a34a] group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium">Snip</span>
                            </button>
                            <button
                                onClick={handleFrame}
                                disabled={status !== 'Idle'}
                                className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition gap-2 group shadow-sm disabled:opacity-50"
                            >
                                <Camera size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium">Frame</span>
                            </button>
                            <button
                                onClick={handleBookmark}
                                disabled={status !== 'Idle'}
                                className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition gap-2 group shadow-sm disabled:opacity-50"
                            >
                                <MapPin size={20} className="text-amber-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium">Bookmark</span>
                            </button>
                        </div>

                        {status === 'Snipping...' && (
                            <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm text-center border border-blue-100 flex flex-col items-center gap-2 animate-pulse">
                                <Scissors size={20} />
                                Drag on page to capture...
                            </div>
                        )}

                        {(status === 'Saving...' || status === 'Processing...') && (
                            <div className="p-4 bg-slate-50 text-slate-700 rounded-lg text-sm text-center border border-slate-100 flex flex-col items-center gap-2">
                                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                {status === 'Saving...'
                                    ? 'Sending to Brain...'
                                    : progress && progress.total > 1
                                        ? `Capturing the whole element (${Math.min(progress.done + 1, progress.total)} of ${progress.total})...`
                                        : 'Processing Image...'}
                            </div>
                        )}

                        <div className="text-xs text-gray-400 text-center mt-8">
                            Open a page and click "Snip" to capture a thought.
                        </div>
                    </div>
                ) : null}

                {status === 'Review' && snipData && (
                    <div className="space-y-4 animate-fade-in">
                        {/* The Snip - only show if image exists */}
                        {capturedImage && (
                            <div className="relative group rounded-lg overflow-y-auto max-h-[55vh] border border-gray-200 shadow-sm bg-gray-100">
                                <img src={capturedImage} alt="Snip" className="w-full h-auto object-contain" />
                                <div className="absolute inset-0 bg-black/5 pointer-events-none border-inset border-black/10"></div>
                            </div>
                        )}
                        {capturedImage && snipData.truncated && (
                            <p className="text-xs text-amber-700">This element is very long, so the image stops partway. The full text is still saved.</p>
                        )}

                        {/* Metadata */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Source</h3>
                            <p className="text-sm font-medium truncate" title={snipData.pageTitle}>{snipData.pageTitle}</p>
                            <p className="text-xs text-gray-400 truncate">
                                {(() => {
                                    try {
                                        return new URL(snipData.pageUrl).hostname;
                                    } catch {
                                        return "Unknown Source";
                                    }
                                })()}
                            </p>
                        </div>



                        {/* Intent Interrogation */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                                Why are you saving this?
                            </label>

                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'agree', label: 'Agree', color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
                                    { id: 'counter', label: 'Counter', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
                                    { id: 'evidence', label: 'Evidence', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
                                    { id: 'framing', label: 'Framing', color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
                                    { id: 'example', label: 'Example', color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' }
                                ].map(intent => (
                                    <button
                                        key={intent.id}
                                        onClick={() => setUserIntent(intent.id as any)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${userIntent === intent.id
                                            ? `${intent.color} ring-2 ring-offset-1 ring-${intent.id === 'counter' ? 'red' : 'blue'}-400 scale-105`
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {intent.label}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={userNote}
                                onChange={(e) => setUserNote(e.target.value)}
                                placeholder={
                                    userIntent === 'counter' ? "Why is this wrong? What's the flaw?" :
                                        userIntent === 'evidence' ? "What does this prove?" :
                                            "Add a quick note..."
                                }
                                className={`w-full text-sm p-3 border rounded-lg focus:ring-2 outline-none min-h-[80px] resize-none transition-colors ${userIntent === 'counter'
                                    ? 'border-red-200 focus:ring-red-500 focus:border-red-500 bg-red-50/30'
                                    : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                autoFocus
                            />
                        </div>

                        {/* Action */}
                        <button
                            onClick={handleSave}
                            disabled={!userIntent}
                            className={`w-full py-2.5 text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 ${userIntent
                                ? 'bg-[#16a34a] hover:bg-[#15803d]'
                                : 'bg-gray-300 cursor-not-allowed hidden'
                                }`}
                        >
                            <Check size={16} />
                            Save to Brain
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
