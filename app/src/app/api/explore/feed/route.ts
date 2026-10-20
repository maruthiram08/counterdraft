import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { TraceLogger } from '@/lib/trace';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { buildFeed, dedupeItems, parseGoogleNewsRss, trimSnippet, type RawFeedItem } from '@/lib/explore/feed';
import { suggestRelatedTopics } from '@/lib/explore/related';
import { annotateItems } from '@/lib/explore/annotate';
import { planSearch, type SearchIntent } from '@/lib/explore/plan';

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

// Tavily adds results with a text snippet, which Google News RSS does not provide.
// For news it searches the last two weeks of news; for learning it searches the whole web,
// where frameworks, case studies and practitioner essays live.
async function fetchTavily(query: string, intent: SearchIntent): Promise<RawFeedItem[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    try {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(intent === 'learn'
                ? { api_key: apiKey, query, topic: 'general', search_depth: 'advanced', max_results: 8 }
                : { api_key: apiKey, query, topic: 'news', search_depth: 'basic', days: 14, max_results: 5 }),
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
                summary: r.content ? trimSnippet(r.content) : undefined,
                otherSources: [],
                query,
            }));
    } catch (err) {
        console.error(`Failed to fetch Tavily results for query "${query}":`, err);
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
        let intent: SearchIntent = 'news';
        let label: string | undefined;

        if (directQuery) {
            // Turn what was typed into focused searches, and decide whether it asks for news or know-how
            const plan = await planSearch(directQuery, lens);
            queries = plan.queries;
            intent = plan.intent;
            label = plan.label;
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

        // 3. Fetch every query in parallel. Know-how searches go to the web, not the news;
        // Google News is only their fallback when the web search returns nothing.
        const searches = queries.slice(0, 3); // Limit to 3 queries to avoid rate limits
        let batches = await Promise.all(searches.flatMap(q => intent === 'learn'
            ? [fetchTavily(q, intent)]
            : [fetchGoogleNews(q), fetchTavily(q, intent)]));
        if (intent === 'learn' && batches.every(b => b.length === 0)) {
            batches = await Promise.all(searches.map(fetchGoogleNews));
        }
        const allItems = dedupeItems(batches.flat());
        TraceLogger.log('explore', 'Feed Search', { queries: searches, intent, results: allItems.length });

        // P2.3: Handle empty search results gracefully
        if (allItems.length === 0) {
            TraceLogger.log('explore', 'No results found', { queries });
            return NextResponse.json({
                feed: [],
                related: [],
                label,
                message: "Nothing found for this search. Try broadening your search terms.",
                queries: queries
            });
        }

        // 4. Get user beliefs, then screen results and suggest related topics in parallel
        const { data: beliefData } = await supabaseAdmin
            .from('beliefs')
            .select('id, statement')
            .eq('user_id', userId)
            .neq('belief_type', 'rejected')
            .order('confidence', { ascending: false })
            .limit(40);
        const beliefs = beliefData || [];

        // Screen at most 24 stories so the prompt stays small; the rest are rarely shown anyway
        const candidates = allItems.slice(0, 24);
        const searchLabel = directQuery || queries.join(', ');
        const [annotations, related] = await Promise.all([
            annotateItems(searchLabel, intent, candidates, beliefs),
            directQuery ? suggestRelatedTopics(directQuery, intent, candidates.map(i => i.title)) : Promise.resolve([]),
        ]);

        const feed = buildFeed(candidates, beliefs, lens, Date.now(), annotations, intent).slice(0, 20);

        return NextResponse.json({
            feed,
            related,
            label,
            intent,
            message: feed.length === 0
                ? 'Nothing found was a strong match for this. Try one of the suggestions below or rephrase the search.'
                : undefined,
        });
    } catch (err) {
        console.error('Feed API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
