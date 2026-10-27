// Captures a whole element, even when it is taller than the window or partly scrolled away.
// chrome.tabs.captureVisibleTab only sees the viewport, so we scroll the element through it,
// take one screenshot per screenful and let the side panel stitch the strips together.

export interface CaptureTile {
    dataUrl: string;
    // Part of the screenshot to keep, in CSS pixels of the viewport
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    // Where that part goes inside the element, in CSS pixels
    dx: number;
    dy: number;
    // Viewport width in CSS pixels, to work out the screenshot's pixel scale
    viewportWidth: number;
}

export interface ElementCapture {
    tiles: CaptureTile[];
    width: number;
    height: number;
    truncated: boolean;
    text: string;
}

// Chrome allows two captureVisibleTab calls per second
const CAPTURE_GAP_MS = 600;
// Keeps the stitched canvas under Chrome's size limits on 2x screens
const MAX_HEIGHT = 12000;
const MAX_TEXT = 10000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// LinkedIn and many blogs hide the rest of a post behind "…see more"; open it so the capture has the whole text
async function expandSeeMore(el: HTMLElement) {
    const buttons = Array.from(el.querySelectorAll<HTMLElement>('button, [role="button"]'))
        .filter(b => !b.closest('a[href]') && b.getAttribute('aria-expanded') !== 'true')
        .filter(b => /^(…|\.\.\.)?\s*(see|show|read)?\s*more$/i.test((b.innerText || '').trim()))
        .slice(0, 3);
    if (buttons.length === 0) return;
    buttons.forEach(b => b.click());
    await sleep(400);
}

function findScroller(el: HTMLElement): HTMLElement | null {
    for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);
        if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && node.scrollHeight > node.clientHeight + 1) {
            return node;
        }
    }
    return null; // the window scrolls
}

function visibleRegion(scroller: HTMLElement | null) {
    const view = { top: 0, left: 0, bottom: window.innerHeight, right: document.documentElement.clientWidth };
    if (!scroller) return view;
    const r = scroller.getBoundingClientRect();
    return {
        top: Math.max(view.top, r.top + scroller.clientTop),
        left: Math.max(view.left, r.left + scroller.clientLeft),
        bottom: Math.min(view.bottom, r.top + scroller.clientTop + scroller.clientHeight),
        right: Math.min(view.right, r.left + scroller.clientLeft + scroller.clientWidth),
    };
}

// Fixed and sticky bars (LinkedIn's top nav, cookie banners) would otherwise repeat in every strip
function hideFloatingElements(el: HTMLElement): () => void {
    const hidden: { node: HTMLElement; value: string; priority: string }[] = [];
    for (const node of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
        if (node.id === 'counterdraft-lens-host' || node.contains(el) || el.contains(node)) continue;
        const { position } = getComputedStyle(node);
        if (position !== 'fixed' && position !== 'sticky') continue;
        hidden.push({ node, value: node.style.getPropertyValue('visibility'), priority: node.style.getPropertyPriority('visibility') });
        node.style.setProperty('visibility', 'hidden', 'important');
    }
    return () => hidden.forEach(({ node, value, priority }) => {
        if (value) node.style.setProperty('visibility', value, priority);
        else node.style.removeProperty('visibility');
    });
}

async function captureViewport(): Promise<string> {
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
    if (!response?.dataUrl) throw new Error(response?.error || 'Capture failed');
    return response.dataUrl;
}

export async function captureElement(el: HTMLElement, onProgress?: (done: number, total: number) => void): Promise<ElementCapture> {
    await expandSeeMore(el);

    const scroller = findScroller(el);
    const scrollTarget = scroller || document.scrollingElement || document.documentElement;
    const startScroll = { x: window.scrollX, y: window.scrollY, top: scroller?.scrollTop ?? 0 };
    const root = document.documentElement;
    const startBehavior = [root.style.scrollBehavior, scroller?.style.scrollBehavior ?? ''];
    root.style.scrollBehavior = 'auto';
    if (scroller) scroller.style.scrollBehavior = 'auto';
    const host = document.getElementById('counterdraft-lens-host');
    if (host) host.style.display = 'none';

    const fullHeight = el.getBoundingClientRect().height;
    const height = Math.min(fullHeight, MAX_HEIGHT);
    const text = (el.innerText || '').trim().slice(0, MAX_TEXT);

    let restoreFloating: (() => void) | null = null;
    const tiles: CaptureTile[] = [];
    let width = 0;
    let lastCapture = 0;

    try {
        let rect = el.getBoundingClientRect();
        let vis = visibleRegion(scroller);
        // Leave the page alone when the element already fits on screen
        const fitsOnScreen = rect.top >= vis.top && rect.top + height <= vis.bottom;
        if (!fitsOnScreen) restoreFloating = hideFloatingElements(el);
        const total = fitsOnScreen ? 1 : Math.max(1, Math.ceil(height / (vis.bottom - vis.top)));

        let captured = 0;
        while (captured < height - 0.5) {
            rect = el.getBoundingClientRect();
            vis = visibleRegion(scroller);
            const wantTop = rect.top + captured;
            const restFits = wantTop >= vis.top && rect.top + height <= vis.bottom;
            if (!restFits) scrollTarget.scrollTop += wantTop - vis.top;

            await nextFrame();
            const wait = CAPTURE_GAP_MS - (Date.now() - lastCapture);
            if (wait > 0) await sleep(wait);

            rect = el.getBoundingClientRect();
            vis = visibleRegion(scroller);
            const top = Math.max(rect.top + captured, vis.top);
            const bottom = Math.min(rect.top + height, vis.bottom);
            const left = Math.max(rect.left, vis.left);
            const right = Math.min(rect.right, vis.right);
            if (bottom - top < 1 || right - left < 1) break; // can't scroll any further

            const dataUrl = await captureViewport();
            lastCapture = Date.now();
            tiles.push({ dataUrl, sx: left, sy: top, sw: right - left, sh: bottom - top, dx: left - rect.left, dy: top - rect.top, viewportWidth: window.innerWidth });
            width = Math.max(width, right - rect.left);
            captured = bottom - rect.top;
            onProgress?.(tiles.length, total);
        }
    } finally {
        restoreFloating?.();
        if (scroller) scroller.scrollTop = startScroll.top;
        window.scrollTo(startScroll.x, startScroll.y);
        root.style.scrollBehavior = startBehavior[0];
        if (scroller) scroller.style.scrollBehavior = startBehavior[1];
        if (host) host.style.display = '';
    }

    if (tiles.length === 0) throw new Error('Nothing of the element was on screen');
    // Drop any part of the element that sits off screen to the left
    const offsetX = Math.min(...tiles.map(t => t.dx));
    tiles.forEach(t => { t.dx -= offsetX; });
    const last = tiles[tiles.length - 1];
    return { tiles, width: width - offsetX, height: last.dy + last.sh, truncated: fullHeight > MAX_HEIGHT, text };
}
