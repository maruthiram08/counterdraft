import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';

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

interface RSSItem {
    title: string;
    link: string;
    pubDate?: string;
    description?: string;
    source?: string;
}

// Simple RSS parser (no external deps)
async function fetchGoogleNewsRSS(query: string): Promise<RSSItem[]> {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    try {
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
        const text = await res.text();

        // Simple regex-based XML parsing (avoiding external XML parser)
        const items: RSSItem[] = [];
        const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const itemXml of itemMatches.slice(0, 5)) { // Limit to 5 per query
            const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || '';
            const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
            const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
            const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || 'Google News';

            if (title && link) {
                items.push({ title, link, pubDate, source });
            }
        }

        return items;
    } catch (err) {
        console.error(`Failed to fetch RSS for query "${query}":`, err);
        return [];
    }
}

export async function GET(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check for direct query param
        const { searchParams } = new URL(req.url);
        const directQuery = searchParams.get('q');

        let queries: string[] = [];

        if (directQuery) {
            // Format query for better Google News results
            // Add "news" or "trends" suffix if query seems like a topic
            const formattedQuery = directQuery.toLowerCase().includes('news') || directQuery.toLowerCase().includes('trends')
                ? directQuery
                : `${directQuery} news trends`;
            queries = [formattedQuery];
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

        // 3. Fetch RSS for each query
        const allItems: (RSSItem & { category: string })[] = [];
        for (const q of queries.slice(0, 3)) { // Limit to 3 queries to avoid rate limits
            const items = await fetchGoogleNewsRSS(q);
            allItems.push(...items.map(item => ({ ...item, category: q })));
        }

        // 4. Get user beliefs for relatability (basic keyword matching)
        const { data: beliefs } = await supabaseAdmin
            .from('beliefs')
            .select('id, statement')
            .eq('user_id', userId)
            .limit(10);

        const feed = allItems.map(item => {
            let relatedBeliefId: string | null = null;
            let relatabilityScore = 0;

            // Simple keyword match
            for (const belief of beliefs || []) {
                const beliefWords = belief.statement.toLowerCase().split(' ');
                const titleWords = item.title.toLowerCase();

                for (const word of beliefWords) {
                    if (word.length > 4 && titleWords.includes(word)) {
                        relatabilityScore += 0.2;
                        relatedBeliefId = belief.id;
                    }
                }
            }

            return {
                title: item.title,
                sourceUrl: item.link,
                source: item.source || 'News',
                category: item.category,
                publishedAt: item.pubDate,
                relatabilityScore: Math.min(relatabilityScore, 1),
                relatedBeliefId,
            };
        });

        // Sort: Relatable first, then by date
        feed.sort((a, b) => b.relatabilityScore - a.relatabilityScore);

        return NextResponse.json({
            feed,
        });
    } catch (err) {
        console.error('Feed API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
