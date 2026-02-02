
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as cheerio from 'cheerio';

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

        // Fetch the HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

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
