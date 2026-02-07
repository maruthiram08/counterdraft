
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getOrCreateUser } from '@/lib/user-sync';

// Force dynamic to prevent caching of failed results
export const dynamic = 'force-dynamic';

/**
 * Validates if a URL is safe for server-side extraction.
 * Blocks localhost, private IP ranges, and cloud metadata services to prevent SSRF.
 */
function isSafeUrl(url: string) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

        const hostname = parsed.hostname.toLowerCase();

        // Block internal metadata services and localhost
        const blockedHosts = [
            'localhost', '127.0.0.1', '0.0.0.0', '::1',
            '169.254.169.254', // AWS/GCP/Azure Metadata
            'instance-data',
            'metadata.google.internal'
        ];

        if (blockedHosts.some(host => hostname === host || hostname.endsWith('.' + host))) {
            return false;
        }

        // Block private IP ranges (basic check)
        if (/^10\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) || /^192\.168\./.test(hostname)) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
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

            if (!isSafeUrl(url)) {
                return NextResponse.json({ error: "Invalid or restricted URL" }, { status: 400 });
            }

            // STRATEGY 1: Standard Fetch (Fast)
            try {
                // console.log(`[Extract] Strategy 1: Fetching ${url}`);
                const response = await fetch(url, {
                    cache: 'no-store',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                    }
                });

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

                    // Optimization: Block images/fonts
                    await page.setRequestInterception(true);
                    page.on('request', (req) => {
                        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                            req.abort();
                        } else {
                            req.continue();
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

            } catch (puppeteerError: any) {
                console.error("[Extract] Puppeteer failed:", puppeteerError);
                return NextResponse.json({
                    error: "Extraction failed (Blocked or Unreachable)",
                    debug: { error: puppeteerError.message }
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

    } catch (error: any) {
        console.error("[Extract API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
