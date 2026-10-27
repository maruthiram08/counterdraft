// The page's own text inside a snipped box (viewport pixels), so the words are exact rather than read
// back from the screenshot. A text node counts when the middle of one of its lines sits inside the box.
// Text drawn in images, canvases or other sites' frames isn't in the page, and is left to the image.

const BLOCK = /^(P|LI|H[1-6]|BLOCKQUOTE|PRE|TD|TH|DT|DD|FIGCAPTION|ARTICLE|SECTION|DIV|TR|UL|OL)$/;

const blockOf = (node: Node): Element | null => {
    let el = node.parentElement;
    while (el && !BLOCK.test(el.tagName)) el = el.parentElement;
    return el;
};

export function textInRect(box: { x: number; y: number; width: number; height: number }, limit = 10000): string {
    const right = box.x + box.width;
    const bottom = box.y + box.height;
    const inside = (r: DOMRect) => {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return r.width > 0 && r.height > 0 && cx >= box.x && cx <= right && cy >= box.y && cy <= bottom;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: node => {
            const parent = node.parentElement;
            if (!node.textContent?.trim() || !parent) return NodeFilter.FILTER_REJECT;
            if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
            if (parent.closest('#counterdraft-overlay')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    const range = document.createRange();
    const lines: string[] = [];
    let current = '';
    let lastBlock: Element | null = null;
    let length = 0;

    for (let node = walker.nextNode(); node && length < limit; node = walker.nextNode()) {
        range.selectNodeContents(node);
        if (!Array.from(range.getClientRects()).some(inside)) continue;
        const words = (node.textContent || '').replace(/\s+/g, ' ');
        const block = blockOf(node);
        // A new block (paragraph, list item, heading) starts a new line
        if (block !== lastBlock && current.trim()) {
            lines.push(current.trim());
            current = '';
        }
        lastBlock = block;
        current += words;
        length += words.length;
    }
    if (current.trim()) lines.push(current.trim());
    range.detach();
    return lines.join('\n').replace(/ {2,}/g, ' ').slice(0, limit);
}
