import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

// Reads a public web page as plain text, refusing private and metadata addresses (SSRF-safe).

const lookup = promisify(dns.lookup);

// Use shared isPrivateIP logic (ideally this should be in a shared lib/security.ts)
function isPrivateIP(ip: string) {
    const ipVersion = net.isIP(ip);
    if (ipVersion === 4) {
        const parts = ip.split('.').map(Number);
        if (parts[0] === 127) return true; // 127.0.0.0/8
        if (parts[0] === 10) return true; // 10.0.0.0/8
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
        if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
        if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (Link-local)
        if (parts[0] === 0) return true; // 0.0.0.0/8
    } else if (ipVersion === 6) {
        const normalized = ip.toLowerCase();
        if (normalized === '::1') return true;
        if (normalized.startsWith('::ffff:')) {
            const ipv4 = normalized.replace('::ffff:', '');
            return isPrivateIP(ipv4);
        }
        const firstHextet = normalized.split(':').find(h => h.length > 0) || '0';
        const firstVal = parseInt(firstHextet, 16);
        if ((firstVal & 0xfe00) === 0xfc00) return true; // fc00::/7 (ULA)
        if ((firstVal & 0xffc0) === 0xfe80) return true; // fe80::/10 (Link-local)
    }
    return false;
}

async function validateUrlForSSRF(url: string) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Invalid protocol');
        }

        const hostname = parsed.hostname.toLowerCase();

        // 1. Basic blocklist for well-known metadata services (fast fail)
        const blockedHosts = [
            'localhost', 'instance-data', 'metadata.google.internal'
        ];
        if (blockedHosts.some(host => hostname === host || hostname.endsWith('.' + host))) {
            throw new Error('Restricted host');
        }

        // 2. Resolve DNS and check all IP addresses
        const addresses = await lookup(hostname, { all: true }) as dns.LookupAddress[];
        if (!addresses || addresses.length === 0) {
            throw new Error('DNS resolution failed');
        }

        for (const { address } of addresses) {
            if (isPrivateIP(address)) {
                throw new Error('Access to private network denied');
            }
        }

        return true;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`URL validation failed: ${message}`);
    }
}

async function fetchWithSafeRedirects(url: string, maxRedirects = 3) {
    let currentUrl = url;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
    };

    for (let i = 0; i <= maxRedirects; i++) {
        await validateUrlForSSRF(currentUrl);
        const response = await fetch(currentUrl, {
            headers,
            redirect: 'manual',
            cache: 'no-store'
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) throw new Error('Redirect without location');
            currentUrl = new URL(location, currentUrl).toString();
            continue;
        }

        return response;
    }
    throw new Error('Too many redirects');
}

export interface PageText {
    title: string;
    content: string;
}

export async function readPage(url: string): Promise<PageText> {
    const response = await fetchWithSafeRedirects(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    return extractPageText(await response.text());
}

// Page furniture that is never the article: menus, sidebars, forms, dialogs
const JUNK = [
    'script', 'style', 'noscript', 'template', 'iframe', 'svg', 'canvas', 'form', 'button', 'select', 'input',
    'nav', 'footer', 'aside', 'dialog',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]', '[role="contentinfo"]', '[role="dialog"]',
    '[aria-hidden="true"]', '[hidden]',
].join(',');

// Cookie, share and sign-up bars, comments and related links. Matched by class name, which can also hit a
// wrapper around the whole article ("shared-layout"), so only short blocks are removed.
const LIKELY_JUNK = [
    'header',
    '[class*="cookie" i]', '[id*="cookie" i]', '[class*="newsletter" i]', '[class*="subscribe" i]',
    '[class*="share" i]', '[class*="social" i]', '[class*="related" i]', '[class*="comment" i]', '[id*="comment" i]',
    '[class*="sidebar" i]', '[class*="advert" i]', '[class*="promo" i]', '[class*="popup" i]', '[class*="modal" i]',
].join(',');
const SHORT_BLOCK = 1500;

const BLOCKS = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, figcaption, td';

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

// The article's own text, one paragraph per line, so headings, paragraphs and lists survive
export function extractPageText(html: string): PageText {
    const $ = cheerio.load(html);
    const title = squash($('meta[property="og:title"]').attr('content') || $('title').first().text() || '');

    $(JUNK).remove();
    $(LIKELY_JUNK).each((_, el) => {
        if (squash($(el).text()).length < SHORT_BLOCK) $(el).remove();
    });

    // The biggest of the usual article containers; fall back to the whole body
    const candidates = ['article', 'main', '[role="main"]', '[itemprop="articleBody"]', '.post-content', '.entry-content']
        .flatMap(sel => $(sel).toArray());
    const lengthOf = (el: Parameters<typeof $>[0]) => squash($(el).text()).length;
    const best = candidates.sort((a, b) => lengthOf(b) - lengthOf(a))[0];
    const root = best && lengthOf(best) >= 200 ? $(best) : $('body');

    const paragraphs: string[] = [];
    const seen = new Set<string>();
    root.find(BLOCKS).each((_, el) => {
        // A block inside another block (a <p> in a <li>) is read with its parent
        if ($(el).parents(BLOCKS).length) return;
        const text = squash($(el).text());
        if (!text || seen.has(text)) return;
        seen.add(text);
        const tag = el.tagName?.toLowerCase() || '';
        if (/^h[1-6]$/.test(tag)) paragraphs.push(`## ${text}`);
        else if (tag === 'li') paragraphs.push(`- ${text}`);
        else if (tag === 'blockquote') paragraphs.push(`> ${text}`);
        else paragraphs.push(text);
    });

    let content = paragraphs.join('\n\n');
    // Pages that put text straight into divs have few blocks; take the container's text instead
    const plain = squash(root.text());
    if (content.length < plain.length * 0.4) content = plain;

    return { title, content };
}
