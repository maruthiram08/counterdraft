
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';

export async function GET(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limits = await UsageService.checkDraftLimit(userId);

        return NextResponse.json({
            usage: limits.usage,
            limit: limits.limit,
            tier: limits.tier,
            allowed: limits.allowed
        });
    } catch (error) {
        console.error("Error fetching usage:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
