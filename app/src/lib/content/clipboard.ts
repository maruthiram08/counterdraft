// Copy text, or formatted HTML with a plain-text fallback, so it pastes well into email and post tools.

export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/** Copies formatted text: editors like Substack, Beehiiv and Gmail paste the HTML, plain fields get the text. */
export async function copyFormatted(html: string, plain: string): Promise<boolean> {
    try {
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([plain], { type: 'text/plain' }),
                }),
            ]);
            return true;
        }
    } catch {
        // Fall through to plain text
    }
    return copyText(plain);
}
