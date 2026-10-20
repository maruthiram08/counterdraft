import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { getOrCreateUser } from '@/lib/user-sync';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UsageService } from '@/lib/billing/usage';
import { rateLimit } from '@/lib/rate-limit';
import { FOR_YOU, buildTrendSearch, type WriterProfile } from '@/lib/explore/trends';

export const maxDuration = 60; // Allow 1 minute for search + LLM

// Topics are picked for each writer, so the cache is per user
const trendsCache = new Map<string, { value: TrendGroup[]; expiresAt: number }>();
const TRENDS_CACHE_TTL_MS = 30 * 60 * 1000;
const TOPICS_PER_CATEGORY = 4;

interface TrendGroup {
    category: string;
    trends: { label: string; query: string }[];
}

async function getWriterProfile(userId: string): Promise<WriterProfile> {
    const [user, beliefs] = await Promise.all([
        supabaseAdmin.from('users').select('role, context').eq('id', userId).single(),
        supabaseAdmin
            .from('beliefs')
            .select('statement')
            .eq('user_id', userId)
            .eq('belief_type', 'core')
            .limit(5),
    ]);
    return {
        role: user.data?.role || undefined,
        context: user.data?.context || undefined,
        beliefs: (beliefs.data || []).map(b => b.statement).filter(Boolean),
    };
}

function describeWriter(profile: WriterProfile): string {
    const lines = [
        profile.role ? `Role: ${profile.role}` : '',
        profile.context ? `What they write about: ${profile.context.slice(0, 400)}` : '',
        profile.beliefs.length ? `Views they hold:\n${profile.beliefs.map(b => `- ${b}`).join('\n')}` : '',
    ].filter(Boolean);
    return lines.length ? lines.join('\n') : '(no profile yet)';
}

async function trendsForCategory(
    category: string,
    profile: WriterProfile,
    exclude: string[],
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
Return JSON: { "trends": [ { "label": "2-4 word chip label", "query": "4-8 word search query a writer would type" } ] }
Rules:
- Labels name a specific story or debate (e.g. "Infosys 70-hour week", not "Work culture").
- Topics must come from the news given. If it is empty, suggest specific, timely debates in the category instead.
${exclude.length ? `- Do not repeat or rephrase these, which the writer has already seen: ${exclude.join('; ')}` : ''}`,
                },
                {
                    role: 'user',
                    content: `Category: ${category === FOR_YOU ? 'Anything relevant to this writer' : category}\n\nWriter:\n${describeWriter(profile)}\n\nThis week's news:\n${context || '(none found)'}`,
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

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const categories: unknown = body.categories;
        if (!Array.isArray(categories) || categories.some(c => typeof c !== 'string') || categories.length > 6) {
            return NextResponse.json({ error: 'Invalid categories' }, { status: 400 });
        }
        const refresh = body.refresh === true;
        const exclude: string[] = Array.isArray(body.exclude)
            ? body.exclude.filter((e: unknown): e is string => typeof e === 'string').slice(0, 20)
            : [];

        const cacheKey = `${userId}:${categories.map(c => c.toLowerCase().trim()).sort().join('|')}`;
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
        const results = await Promise.all(categories.map(cat => trendsForCategory(cat, profile, exclude, apiKey)));

        await UsageService.incrementSearchCount(userId);
        if (!refresh) trendsCache.set(cacheKey, { value: results, expiresAt: Date.now() + TRENDS_CACHE_TTL_MS });

        return NextResponse.json({ groups: results });

    } catch (e: unknown) {
        console.error('Trends API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
