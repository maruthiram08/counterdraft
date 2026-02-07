
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

export const maxDuration = 30;

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

        const response = await fetchWithRedirectValidation(url);

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

    } catch (error: any) {
        console.error('Scrape error:', error);
        return NextResponse.json({ error: 'Failed to read content', details: error.message }, { status: 500 });
    }
}

const lookup = promisify(dns.lookup);

async function validateUrl(inputUrl: string) {
    const parsed = new URL(inputUrl);

    // 1. Protocol Check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
    }

    // 2. DNS Resolution
    const addresses = await lookup(parsed.hostname, { all: true }) as dns.LookupAddress[];
    if (!addresses || addresses.length === 0) {
        throw new Error('DNS lookup failed');
    }

    // 3. Private IP Check (all resolved addresses)
    for (const { address } of addresses) {
        if (isPrivateIP(address)) {
            throw new Error('Access to private network denied');
        }
    }
}

function isPrivateIP(ip: string) {
    const ipVersion = net.isIP(ip);
    if (ipVersion === 6) {
        return isPrivateIPv6(ip);
    }
    if (ipVersion === 4) {
        return isPrivateIPv4(ip);
    }
    return true; // Unknown IP format, deny by default
}

function isPrivateIPv4(ip: string) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false; // Basic check, assuming IPv4 for simplicity

    // 127.0.0.0/8 loopback
    if (parts[0] === 127) return true;

    // 0.0.0.0/8 "this host on this network"
    if (parts[0] === 0) return true;

    // 10.0.0.0/8
    if (parts[0] === 10) return true;

    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 100.64.0.0/10 (CGNAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    return false;
}

function isPrivateIPv6(ip: string) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1') return true;

    // IPv4-mapped IPv6
    if (normalized.startsWith('::ffff:')) {
        const ipv4 = normalized.replace('::ffff:', '');
        return isPrivateIPv4(ipv4);
    }

    const firstHextet = normalized.split(':').find(h => h.length > 0) || '0';
    const firstVal = parseInt(firstHextet, 16);

    // fc00::/7 unique local address
    if ((firstVal & 0xfe00) === 0xfc00) return true;
    // fe80::/10 link-local
    if ((firstVal & 0xffc0) === 0xfe80) return true;

    return false;
}

async function fetchWithRedirectValidation(inputUrl: string, maxRedirects = 3) {
    let currentUrl = inputUrl;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    for (let i = 0; i <= maxRedirects; i++) {
        await validateUrl(currentUrl);
        const response = await fetch(currentUrl, { headers, redirect: 'manual' });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
                throw new Error('Redirect without location');
            }
            currentUrl = new URL(location, currentUrl).toString();
            continue;
        }

        return response;
    }

    throw new Error('Too many redirects');
}
