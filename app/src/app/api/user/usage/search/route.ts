import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Check Limit PRE-Increment
        // Strictly block if already over limit
        const check = await UsageService.checkSearchLimit(userId);
        if (!check.allowed) {
            return NextResponse.json({
                allowed: false,
                reason: check.reason,
                usage: check.usage,
                limit: check.limit,
                tier: check.tier
            }, { status: 403 });
        }

        // 2. Increment
        await UsageService.incrementSearchCount(userId);

        // 3. Return Success (and new count)
        return NextResponse.json({
            allowed: true,
            usage: (check.usage as number) + 1,
            limit: check.limit
        });

    } catch (error) {
        console.error("Search Usage Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
