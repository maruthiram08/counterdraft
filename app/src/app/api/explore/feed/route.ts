import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { refineSearchQuery } from '@/lib/brain/ideation';
import { TraceLogger } from '@/lib/trace';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { buildFeed, dedupeItems, parseGoogleNewsRss, type RawFeedItem } from '@/lib/explore/feed';
import { suggestRelatedTopics } from '@/lib/explore/related';

// Mapping from our categories to Google News search terms
const CATEGORY_TO_QUERY: Record<string, string> = {
    tech: 'technology',
    'tech.ai_ethics': 'AI ethics',
    'tech.generative_models': 'generative AI',
    'tech.startups': 'tech startups',
    'tech.hardware': 'hardware computing',
    culture: 'culture trends',
    'culture.media': 'media industry',
    'culture.trends': 'social trends',
    'culture.philosophy': 'philosophy ideas',
    business: 'business strategy',
    'business.leadership': 'leadership',
    'business.marketing': 'marketing trends',
    'business.growth': 'business growth',
    personal: 'personal development',
    'personal.productivity': 'productivity tips',
    'personal.mindset': 'mindset growth',
    'personal.career': 'career advice',
};

async function fetchGoogleNews(query: string): Promise<RawFeedItem[]> {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    try {
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
        return parseGoogleNewsRss(await res.text(), query);
    } catch (err) {
        console.error(`Failed to fetch RSS for query "${query}":`, err);
        return [];
    }
}

// Tavily adds stories with a text snippet, which Google News RSS does not provide.
async function fetchTavilyNews(query: string): Promise<RawFeedItem[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    try {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                topic: 'news',
                search_depth: 'basic',
                days: 14,
                max_results: 5,
            }),
            next: { revalidate: 3600 },
        });
        type TavilyResult = { title?: string; url?: string; content?: string; published_date?: string };
        const data = await res.json() as { results?: TavilyResult[] };

        return (data.results || [])
            .filter(r => r.title && r.url)
            .map(r => ({
                title: r.title!,
                link: r.url!,
                source: new URL(r.url!).hostname.replace(/^www\./, ''),
                pubDate: r.published_date,
                summary: r.content ? r.content.slice(0, 280) : undefined,
                otherSources: [],
                query,
            }));
    } catch (err) {
        console.error(`Failed to fetch Tavily news for query "${query}":`, err);
        return [];
    }
}

export async function GET(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 0. Rate Limiting
        const ip = getClientIp(req);
        const limitResult = rateLimit(`explore-feed:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        // Check for direct query param
        const { searchParams } = new URL(req.url);
        const directQuery = searchParams.get('q');
        const lens = searchParams.get('lens') || 'default';

        let queries: string[] = [];

        if (directQuery) {
            // Intelligent Refinement:
            // If query is "complex" (has > 3 words), use LLM to extract keywords.
            // Otherwise, just do simple formatting.
            const wordCount = directQuery.split(' ').length;

            if (wordCount > 3 || lens === 'beginner') {
                console.log(`[Explore] Refine query with lens ${lens}: "${directQuery}"`);
                try {
                    queries = await refineSearchQuery(directQuery, lens);
                } catch (e) {
                    console.error("Refine failed, fallback to raw query", e);
                    queries = [directQuery];
                }
            } else {
                // Short queries go to the news search as typed
                queries = [directQuery.trim()];
            }
        } else {
            // Fallback to saved interests
            const { data: interestData } = await supabaseAdmin
                .from('user_interests')
                .select('categories, subcategories')
                .eq('user_id', userId)
                .single();

            const categories = interestData?.categories || [];
            const subcategories = interestData?.subcategories || [];

            for (const sub of subcategories) {
                if (CATEGORY_TO_QUERY[sub]) queries.push(CATEGORY_TO_QUERY[sub]);
            }
            for (const cat of categories) {
                if (CATEGORY_TO_QUERY[cat] && !queries.includes(CATEGORY_TO_QUERY[cat])) {
                    queries.push(CATEGORY_TO_QUERY[cat]);
                }
            }

            if (queries.length === 0) {
                queries.push('technology', 'business', 'culture');
            }
        }

        // 3. Fetch every query from both sources in parallel
        const searches = queries.slice(0, 3); // Limit to 3 queries to avoid rate limits
        const batches = await Promise.all(searches.flatMap(q => [fetchGoogleNews(q), fetchTavilyNews(q)]));
        const allItems = dedupeItems(batches.flat());
        TraceLogger.log('explore', 'Feed Search', { queries: searches, results: allItems.length });

        // P2.3: Handle empty search results gracefully
        if (allItems.length === 0) {
            TraceLogger.log('explore', 'No results found', { queries });
            return NextResponse.json({
                feed: [],
                related: [],
                message: "No recent news found for your topics. Try broadening your search terms or check back later for fresh content.",
                queries: queries
            });
        }

        // 4. Get user beliefs for relatability, and related topics to branch into
        const [{ data: beliefs }, related] = await Promise.all([
            supabaseAdmin
                .from('beliefs')
                .select('id, statement')
                .eq('user_id', userId)
                .neq('belief_type', 'rejected')
                .limit(50),
            directQuery ? suggestRelatedTopics(directQuery, allItems.map(i => i.title)) : Promise.resolve([]),
        ]);

        const feed = buildFeed(allItems, beliefs || [], lens).slice(0, 20);

        return NextResponse.json({
            feed,
            related,
        });
    } catch (err) {
        console.error('Feed API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
