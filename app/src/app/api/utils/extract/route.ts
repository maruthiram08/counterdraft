
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getOrCreateUser } from '@/lib/user-sync';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const lookup = promisify(dns.lookup);

// Force dynamic to prevent caching of failed results
export const dynamic = 'force-dynamic';

/**
 * Checks if an IP address belongs to a private or restricted range.
 */
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

/**
 * Robustly validates if a URL is safe to fetch, including DNS resolution.
 */
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

/**
 * Fetches a URL while manually validating every redirect to prevent SSRF.
 */
async function fetchWithSafeRedirects(url: string, maxRedirects = 5) {
    let currentUrl = url;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    };

    for (let i = 0; i < maxRedirects; i++) {
        await validateUrlForSSRF(currentUrl);
        const response = await fetch(currentUrl, {
            headers,
            redirect: 'manual',
            cache: 'no-store'
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) return response;
            currentUrl = new URL(location, currentUrl).toString();
            continue;
        }

        return response;
    }
    throw new Error('Too many redirects');
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const type = formData.get('type') as string;

        if (type === 'url') {
            const url = formData.get('url') as string;
            if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

            try {
                const response = await fetchWithSafeRedirects(url);

                if (response.ok) {
                    const html = await response.text();

                    // Simple check for block pages
                    if (!html.includes("challenge") && !html.includes("cf-turnstile") && !html.includes("Just a moment...")) {
                        const $ = cheerio.load(html);

                        // Clean
                        $('script').remove();
                        $('style').remove();
                        $('nav').remove();
                        $('footer').remove();
                        $('header').remove();
                        $('noscript').remove();
                        $('iframe').remove();

                        const text = $('body').text().replace(/\s+/g, ' ').trim();

                        // If we got substantial text, return it.
                        // If it's too short, it might be a block page that we missed, so fall through to Puppeteer.
                        if (text.length > 500) {
                            console.log(`[Extract] Fetch success: ${text.length} chars`);
                            return NextResponse.json({ text, debug: { method: 'fetch', length: text.length } });
                        } else {
                            console.warn(`[Extract] Fetch returned obscure/empty content (${text.length} chars). Falling back.`);
                        }
                    } else {
                        console.warn("[Extract] Fetch detected blocking/challenge page.");
                    }
                } else {
                    console.warn(`[Extract] Fetch failed with status ${response.status}`);
                }
            } catch (e) {
                console.warn("[Extract] Fetch error:", e);
            }

            // STRATEGY 2: Puppeteer (Robust)
            try {
                console.log(`[Extract] Strategy 2: Puppeteer for ${url}`);

                // Dynamic import to avoid issues in environments where puppeteer isn't installed
                const puppeteer = (await import('puppeteer')).default;

                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });

                try {
                    const page = await browser.newPage();
                    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

                    // Optimization: Block images/fonts AND enforce SSRF safety
                    await page.setRequestInterception(true);
                    page.on('request', async (interceptedRequest) => {
                        const requestUrl = interceptedRequest.url();

                        try {
                            // Validate the sub-request URL
                            await validateUrlForSSRF(requestUrl);

                            if (['image', 'stylesheet', 'font', 'media'].includes(interceptedRequest.resourceType())) {
                                interceptedRequest.abort();
                            } else {
                                interceptedRequest.continue();
                            }
                        } catch {
                            console.warn(`[Extract] Puppeteer blocked unsafe request: ${requestUrl}`);
                            interceptedRequest.abort('blockedbyclient');
                        }
                    });

                    // Navigate
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

                    // Extract
                    const text = await page.evaluate(() => {
                        // Client-side cleanup
                        const badSelectors = ['script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript', '.ad', '#cookie-banner', '[id*=cookie]'];
                        badSelectors.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));

                        return document.body.innerText.replace(/\s+/g, ' ').trim();
                    });

                    console.log(`[Extract] Puppeteer success: ${text.length} chars`);
                    return NextResponse.json({ text, debug: { method: 'puppeteer', length: text.length } });

                } finally {
                    await browser.close();
                }

            } catch (puppeteerError: unknown) {
                console.error("[Extract] Puppeteer failed:", puppeteerError);
                const message = puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError);
                return NextResponse.json({
                    error: "Extraction failed (Blocked or Unreachable)",
                    debug: { error: message }
                }, { status: 500 });
            }
        }
        else if (type === 'file') {
            const formData = await req.formData();
            const file = formData.get('file') as File;
            if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

            const buffer = Buffer.from(await file.arrayBuffer());
            const text = buffer.toString('utf-8');
            return NextResponse.json({ text });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    } catch (error: unknown) {
        console.error("[Extract API Error]:", error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
