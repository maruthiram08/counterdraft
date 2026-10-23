import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { getOrCreateUser } from '@/lib/user-sync';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UsageService } from '@/lib/billing/usage';
import { rateLimit } from '@/lib/rate-limit';
import { parseSurprise, type SurprisePick } from '@/lib/explore/surprise';
import { cleanTaste, describeTaste, tasteKey, type Taste } from '@/lib/explore/taste';
import { CATEGORIES_PER_SET, FOR_YOU, buildTrendSearch, describeTrackRecord, exploreTrackRecord, pickCategories, type WriterProfile } from '@/lib/explore/trends';

export const maxDuration = 60; // Allow 1 minute for search + LLM

// Topics are picked for each writer, so the cache is per user
const trendsCache = new Map<string, { value: TrendGroup[]; expiresAt: number }>();
const TRENDS_CACHE_TTL_MS = 30 * 60 * 1000;
const TOPICS_PER_CATEGORY = 4;

// Categories drawn from each writer's niche; they change slowly, so they are kept for a day
const nicheCache = new Map<string, { value: string[]; expiresAt: number }>();
const NICHE_TTL_MS = 24 * 60 * 60 * 1000;

interface TrendGroup {
    category: string;
    trends: { label: string; query: string }[];
}

async function getWriterProfile(userId: string): Promise<WriterProfile> {
    const [user, beliefs, written] = await Promise.all([
        supabaseAdmin.from('users').select('role, context').eq('id', userId).single(),
        supabaseAdmin
            .from('beliefs')
            .select('statement')
            .eq('user_id', userId)
            .eq('belief_type', 'core')
            .limit(5),
        // What came out of Explore and actually got written: the results the topics learn from
        supabaseAdmin
            .from('content_items')
            .select('hook, stage, brain_metadata')
            .eq('user_id', userId)
            .eq('source_type', 'explore')
            .in('stage', ['draft', 'published'])
            .order('updated_at', { ascending: false })
            .limit(30),
    ]);
    return {
        role: user.data?.role || undefined,
        context: user.data?.context || undefined,
        beliefs: (beliefs.data || []).map(b => b.statement).filter(Boolean),
        wrote: exploreTrackRecord(written.data || []),
    };
}

function describeWriter(profile: WriterProfile, taste: Taste): string {
    const lines = [
        profile.role ? `Role: ${profile.role}` : '',
        profile.context ? `What they write about: ${profile.context.slice(0, 400)}` : '',
        profile.beliefs.length ? `Views they hold:\n${profile.beliefs.map(b => `- ${b}`).join('\n')}` : '',
        describeTrackRecord(profile.wrote),
        describeTaste(taste),
    ].filter(Boolean);
    return lines.length ? lines.join('\n') : '(no profile yet)';
}

// Topic areas this writer's audience follows, used as rotating Explore tabs
async function nicheCategories(userId: string, profile: WriterProfile, taste: Taste): Promise<string[]> {
    if (!profile.role && !profile.context && profile.beliefs.length === 0 && !profile.wrote?.length) return [];
    const cacheKey = `${userId}:${tasteKey(taste)}`;
    const cached = nicheCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `Suggest 8 topic areas this writer and their audience follow, to use as browsing categories for finding things to post about.
Each is 1-3 words (e.g. "Fatherhood", "Indian workplace", "Remote work"), broad enough to have news every week, and distinct from the others.
Return JSON: { "categories": ["..."] }`,
                },
                { role: 'user', content: describeWriter(profile, taste) },
            ],
        });
        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        const categories = (Array.isArray(parsed.categories) ? parsed.categories : [])
            .filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0 && c.length <= 40)
            .map((c: string) => c.trim())
            .slice(0, 8);
        nicheCache.set(cacheKey, { value: categories, expiresAt: Date.now() + NICHE_TTL_MS });
        return categories;
    } catch (e) {
        console.error('Niche categories failed:', e);
        return [];
    }
}

async function trendsForCategory(
    category: string,
    profile: WriterProfile,
    exclude: string[],
    taste: Taste,
    apiKey: string
): Promise<TrendGroup> {
    const query = buildTrendSearch(category, profile);
    if (!query) return { category, trends: [] };

    try {
        const searchRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                search_depth: 'basic',
                topic: 'news',
                days: 7,
                max_results: 8,
            }),
        });
        type TavilyResult = { title?: string; content?: string };
        const searchData = await searchRes.json() as { results?: TavilyResult[] };
        const context = (searchData.results || [])
            .filter(r => r.title)
            .map(r => `- ${r.title}${r.content ? `: ${r.content.slice(0, 160)}` : ''}`)
            .join('\n');

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: exclude.length ? 0.9 : 0.5,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You suggest starting topics for a writer looking for something to post about.
From this week's news below, pick ${TOPICS_PER_CATEGORY} distinct topics that this particular writer could take a real position on.
Prefer topics that touch their role, what they write about or the views they hold; skip ones they would have nothing to say about.
Follow what they asked for more of, and leave out anything like what they marked "Not for me".
Return JSON: { "trends": [ { "label": "2-4 word chip label", "query": "4-8 word search query a writer would type" } ] }
Rules:
- Labels name a specific story or debate (e.g. "Infosys 70-hour week", not "Work culture").
- Topics must come from the news given. If it is empty, suggest specific, timely debates in the category instead.
${exclude.length ? `- Do not repeat or rephrase these, which the writer has already seen: ${exclude.join('; ')}` : ''}`,
                },
                {
                    role: 'user',
                    content: `Category: ${category === FOR_YOU ? 'Anything relevant to this writer' : category}\n\nWriter:\n${describeWriter(profile, taste)}\n\nThis week's news:\n${context || '(none found)'}`,
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        const trends = (Array.isArray(parsed.trends) ? parsed.trends : [])
            .filter((t: { label?: unknown; query?: unknown }) => typeof t?.label === 'string' && typeof t?.query === 'string')
            .slice(0, TOPICS_PER_CATEGORY);
        return { category, trends };
    } catch (e) {
        console.error(`Error fetching trends for ${category}:`, e);
        return { category, trends: [] };
    }
}

// A strong story from this week's wider news, away from the writer's usual areas but within reach of their views
async function surprisePick(userId: string, profile: WriterProfile, taste: Taste, exclude: string[], apiKey: string): Promise<SurprisePick | null> {
    const usual = [...await nicheCategories(userId, profile, taste), ...taste.more];
    try {
        const searchRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: 'most talked about stories this week across science, culture, business, sport and society',
                search_depth: 'basic',
                topic: 'news',
                days: 7,
                max_results: 15,
            }),
        });
        const searchData = await searchRes.json() as { results?: { title?: string; content?: string }[] };
        const news = (searchData.results || [])
            .filter(r => r.title)
            .map(r => `- ${r.title}${r.content ? `: ${r.content.slice(0, 160)}` : ''}`)
            .join('\n');

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 1,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You surprise a writer with one story to post about that they would never have searched for.
Pick ONE story from this week's news that sits outside their usual areas, yet connects to their role or one of their views, so they could take a real position on it.
${usual.length ? `Their usual areas, to stay away from: ${usual.join('; ')}` : ''}
${exclude.length ? `Already suggested, pick something else: ${exclude.join('; ')}` : ''}
Return JSON: { "label": "2-5 word name of the story", "query": "4-8 word search query for it", "why": "one sentence, to the writer as 'you', on the link between this story and their work or views" }`,
                },
                {
                    role: 'user',
                    content: `Writer:\n${describeWriter(profile, taste)}\n\nThis week's news:\n${news || '(none found; pick a specific, timely story you know of)'}`,
                },
            ],
        });
        return parseSurprise(JSON.parse(completion.choices[0].message.content || '{}'), usual);
    } catch (e) {
        console.error('Surprise pick failed:', e);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        if (body.mode === 'surprise') {
            const limit = rateLimit(`explore-surprise:${userId}`, { windowMs: 15 * 60 * 1000, max: 15 });
            if (!limit.allowed) {
                return NextResponse.json({ error: 'Too many surprises. Try again in a few minutes.' }, { status: 429 });
            }
            const apiKey = process.env.TAVILY_API_KEY;
            if (!apiKey) return NextResponse.json({ error: 'Missing Tavily Key' }, { status: 500 });
            const exclude: string[] = Array.isArray(body.exclude)
                ? body.exclude.filter((e: unknown): e is string => typeof e === 'string').slice(0, 10)
                : [];
            const pick = await surprisePick(userId, await getWriterProfile(userId), cleanTaste(body.taste), exclude, apiKey);
            return pick
                ? NextResponse.json({ pick })
                : NextResponse.json({ error: "Couldn't find a surprise right now. Try again." }, { status: 502 });
        }
        // 'discover' picks a fresh, random set of categories for this writer and fetches their topics
        const discover = body.mode === 'discover';
        const categories: unknown = body.categories;
        if (!discover && (!Array.isArray(categories) || categories.some(c => typeof c !== 'string') || categories.length > 6)) {
            return NextResponse.json({ error: 'Invalid categories' }, { status: 400 });
        }
        const refresh = body.refresh === true;
        const exclude: string[] = Array.isArray(body.exclude)
            ? body.exclude.filter((e: unknown): e is string => typeof e === 'string').slice(0, 20)
            : [];

        const taste = cleanTaste(body.taste);
        const cacheKey = (discover
            ? `${userId}:discover`
            : `${userId}:${(categories as string[]).map(c => c.toLowerCase().trim()).sort().join('|')}`) + `:${tasteKey(taste)}`;
        if (!refresh) {
            const cached = trendsCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return NextResponse.json({ groups: cached.value });
            }
        } else {
            const limit = rateLimit(`explore-trends-refresh:${userId}`, { windowMs: 15 * 60 * 1000, max: 15 });
            if (!limit.allowed) {
                return NextResponse.json({ error: 'Too many refreshes. Try again in a few minutes.' }, { status: 429 });
            }
        }

        const limitCheck = await UsageService.checkSearchLimit(userId);
        if (!limitCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Limit Reached',
                    message: limitCheck.reason,
                    tier: limitCheck.tier,
                    upgradeUrl: '/pricing'
                },
                { status: 403 }
            );
        }

        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Tavily Key' }, { status: 500 });
        }

        const profile = await getWriterProfile(userId);
        const chosen = discover
            ? [FOR_YOU, ...pickCategories(await nicheCategories(userId, profile, taste), exclude, CATEGORIES_PER_SET)]
            : categories as string[];
        // In discover mode `exclude` lists categories, not topics, so topics start fresh
        const topicExclude = discover ? [] : exclude;
        const results = (await Promise.all(chosen.map(cat => trendsForCategory(cat, profile, topicExclude, taste, apiKey))))
            .filter(group => group.category === FOR_YOU || group.trends.length > 0);

        await UsageService.incrementSearchCount(userId);
        if (!refresh) trendsCache.set(cacheKey, { value: results, expiresAt: Date.now() + TRENDS_CACHE_TTL_MS });

        return NextResponse.json({ groups: results });

    } catch (e: unknown) {
        console.error('Trends API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
