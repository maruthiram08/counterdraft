import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Allow 1 minute for search + LLM

const trendsCache = new Map<string, { value: TrendGroup[]; expiresAt: number }>();
const TRENDS_CACHE_TTL_MS = 30 * 60 * 1000;

interface TrendGroup {
    category: string;
    trends: { label: string; query: string }[];
}

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { categories } = await req.json(); // Expect ["Technology", "Culture", ...]

        if (!categories || !Array.isArray(categories)) {
            return NextResponse.json({ error: 'Invalid categories' }, { status: 400 });
        }

        const cacheKey = categories.map((c: string) => c.toLowerCase().trim()).sort().join('|');
        const cached = trendsCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json({ groups: cached.value });
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

        // 1. Perform a broad search for trending topics across these categories
        // We'll do one consolidated search to save time/tokens if possible, or parallel searches.
        // For quality, let's do parallel searches per category.

        const results = await Promise.all(categories.map(async (cat) => {
            try {
                // Search Tavily for "trending news [category] today"
                const searchRes = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: apiKey,
                        query: `trending news and hot topics in ${cat} today`,
                        search_depth: "basic", // Basic is faster
                        topic: "news",
                        max_results: 5,
                        include_answer: true
                    })
                });

                const searchData = await searchRes.json();
                const context = searchData.answer || searchData.results?.map((r: any) => r.title).join('\n') || "";

                // Use LLM to extract 3 specific, punchy trends
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: `You are a trend spotter. Identify 3 specific, distinct, and high-interest trending topics from the search context.
                            
                            Return valid JSON:
                            {
                                "trends": [
                                    { "label": "Short Title (max 3 words)", "query": "Search query to learn more" }
                                ]
                            }
                            
                            Rules:
                            - Labels must be specific (e.g., "Sora Release" not "AI News")
                            - Trends must be real news from the context.
                            - If context is empty, fallback to generic evergreen trends for this category.`
                        },
                        {
                            role: "user",
                            content: `Category: ${cat}\nContext:\n${context}`
                        }
                    ],
                    response_format: { type: "json_object" }
                });

                const content = completion.choices[0].message.content;
                const parsed = content ? JSON.parse(content) : { trends: [] };

                return {
                    category: cat,
                    trends: parsed.trends.slice(0, 3)
                };

            } catch (e) {
                console.error(`Error fetching trends for ${cat}:`, e);
                return { category: cat, trends: [] }; // Graceful failure
            }
        }));

        await UsageService.incrementSearchCount(userId);
        trendsCache.set(cacheKey, { value: results, expiresAt: Date.now() + TRENDS_CACHE_TTL_MS });

        return NextResponse.json({ groups: results });

    } catch (e) {
        console.error('Trends API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
