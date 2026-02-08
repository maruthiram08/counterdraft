import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { CompetitorService } from '@/lib/tools/competitor';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const maxDuration = 120; // Allow 2 minutes for Tavily + LLM calls

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 0. Rate Limiting
        const ip = getClientIp(req);
        const limitResult = rateLimit(`competitor:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 10 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        const { text, competitorUrl } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text required' }, { status: 400 });
        }

        const result = await CompetitorService.checkCompetitors(text, competitorUrl);

        return NextResponse.json({ result });

    } catch (error) {
        console.error("Competitor Check API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
