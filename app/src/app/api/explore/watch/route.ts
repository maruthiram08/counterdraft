import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { rateLimit } from '@/lib/rate-limit';
import { dedupeItems, parseGoogleNewsRss } from '@/lib/explore/feed';
import { newSince, watchQuery, type WatchedTopic } from '@/lib/explore/watch';

const MAX_TOPICS = 6;

/**
 * POST { seen: { [itemId]: ISO time the writer last looked } }
 * Returns the writer's saved topics with how many stories appeared since then
 * (or since saving, for a topic they haven't opened from here yet).
 */
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const limit = rateLimit(`explore-watch:${userId}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limit.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
        }

        const body = await req.json().catch(() => ({}));
        const seen = (body?.seen && typeof body.seen === 'object' ? body.seen : {}) as Record<string, unknown>;

        const { data, error } = await supabaseAdmin
            .from('content_items')
            .select('id, hook, created_at')
            .eq('user_id', userId)
            .eq('status', 'active')
            .eq('brain_metadata->explore->>savedAs', 'topic')
            .order('created_at', { ascending: false })
            .limit(MAX_TOPICS);
        if (error) throw error;

        const topics: WatchedTopic[] = await Promise.all((data || []).map(async (item) => {
            const title = String(item.hook || '');
            const query = watchQuery(title);
            const lastSeen = typeof seen[item.id] === 'string' && !Number.isNaN(Date.parse(seen[item.id] as string))
                ? seen[item.id] as string
                : item.created_at;
            let fresh: ReturnType<typeof newSince> = [];
            if (query) {
                try {
                    const res = await fetch(
                        `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
                        { next: { revalidate: 3600 } }
                    );
                    fresh = newSince(dedupeItems(parseGoogleNewsRss(await res.text(), query, 20)), lastSeen, title);
                } catch (err) {
                    console.error(`Watch search failed for "${query}":`, err);
                }
            }
            return {
                id: item.id,
                title,
                query,
                newCount: fresh.length,
                latest: fresh.slice(0, 2).map(i => ({
                    title: i.title,
                    url: i.link,
                    source: i.source,
                    publishedAt: i.pubDate ? new Date(i.pubDate).toISOString() : undefined,
                })),
            };
        }));

        return NextResponse.json({ topics: topics.filter(t => t.query) });
    } catch (err) {
        console.error('Explore watch error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
