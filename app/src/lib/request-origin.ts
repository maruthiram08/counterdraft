// CSRF origin check for API writes, kept free of Next.js imports so it can be unit tested.

// Exact host match (a substring check would accept lookalikes such as counterdraft.app.evil.com)
export function hasHost(url: string | null, host: string | null): boolean {
    if (!url || !host) return false;
    try {
        return new URL(url).host === host;
    } catch {
        return false;
    }
}

/**
 * Returns a rejection reason, or null when the request may proceed.
 *
 * Origin "null" with Sec-Fetch-Site "none" is a request the browser itself started (not a web
 * page), which is what Chrome sends for the Lens extension after counterdraft.com redirects the
 * POST to www.counterdraft.com: a cross-host redirect blanks the Origin. Web pages cannot send
 * Sec-Fetch-Site "none" (a sandboxed iframe or data: page gets "cross-site"), so this stays closed
 * to cross-site forgery.
 */
export function checkWriteOrigin(headers: {
    origin: string | null;
    referer: string | null;
    host: string | null;
    secFetchSite: string | null;
}): 'Invalid Origin' | 'Missing Referer/Origin' | null {
    const { origin, referer, host, secFetchSite } = headers;

    if (origin === 'null' && secFetchSite === 'none') return null;

    if (origin && !hasHost(origin, host) && !origin.startsWith('chrome-extension://')) {
        return 'Invalid Origin';
    }

    if (!origin && !hasHost(referer, host)) {
        return 'Missing Referer/Origin';
    }

    return null;
}
