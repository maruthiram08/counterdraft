
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isSubscriptionLive } from '@/lib/billing/plans';

export async function GET() {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limits = await UsageService.checkDraftLimit(userId);

        // When Pro ends, so Settings can say so (null = not Pro, or no end date)
        const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('status, plan_id, current_period_end, source')
            .eq('user_id', userId)
            .maybeSingle();
        const live = isSubscriptionLive(sub);

        return NextResponse.json({
            usage: limits.usage,
            limit: limits.limit,
            tier: limits.tier,
            allowed: limits.allowed,
            pro_until: live ? sub?.current_period_end ?? null : null,
            pro_source: live ? sub?.source ?? null : null,
        });
    } catch (error) {
        console.error("Error fetching usage:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
