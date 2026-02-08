
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

export const maxDuration = 30;

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const response = await fetchWithSafeRedirects(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract Title
        const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || "";

        // Remove junk
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('header').remove();
        $('footer').remove();
        $('noscript').remove();
        $('iframe').remove();
        $('[role="banner"]').remove();
        $('[role="navigation"]').remove();

        // Extract Text (prioritize article/main)
        let content = $('article').text().trim();
        if (!content || content.length < 200) {
            content = $('main').text().trim();
        }
        if (!content || content.length < 200) {
            content = $('body').text().trim();
        }

        // Cleanup whitespace
        const cleanContent = content.replace(/\s+/g, ' ').trim();

        return NextResponse.json({
            title,
            content: cleanContent // Full content, no limit
        });

    } catch (error: unknown) {
        console.error('Scrape error:', error);
        const details = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: 'Failed to read content', details }, { status: 500 });
    }
}
