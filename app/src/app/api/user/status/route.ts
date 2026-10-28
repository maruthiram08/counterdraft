import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';
import { PRICING_CONFIG, Tier } from '@/lib/constants/pricing';
import { isSubscriptionLive } from '@/lib/billing/plans';
import { applyApprovedInvite } from '@/lib/billing/invites';

export async function GET() {
    try {
        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('onboarding_completed, role, context, voice_tone, email')
            .eq('id', userId)
            .single();

        if (error || !user) {
            // If user missing, default to false
            return NextResponse.json({ onboarding_completed: false });
        }

        // Check Limits
        let limitCheck = await UsageService.checkDraftLimit(userId);

        // Free account with an approved beta request: apply its invite, wherever they signed up
        let inviteApplied: string | null = null;
        if (limitCheck.tier === 'free') {
            inviteApplied = await applyApprovedInvite(userId, user.email);
            if (inviteApplied) limitCheck = await UsageService.checkDraftLimit(userId);
        }

        // When the current Pro period ends (for the renewal reminder); null = no end date or not Pro
        const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('status, plan_id, current_period_end')
            .eq('user_id', userId)
            .maybeSingle();
        const proUntil = isSubscriptionLive(sub) ? sub?.current_period_end ?? null : null;

        // Safe access to pricing config
        const tierConfig = PRICING_CONFIG.LIMITS[limitCheck.tier as Tier];
        const searchLimit = tierConfig ? tierConfig.SEARCHES_PER_MONTH : 20;

        return NextResponse.json({
            onboarding_completed: user.onboarding_completed,
            profile: {
                role: user.role,
                context: user.context,
                voice_tone: user.voice_tone
            },
            usage: {
                is_allowed: limitCheck.allowed,
                tier: limitCheck.tier,
                reason: limitCheck.reason,
                count: limitCheck.usage,
                limit: limitCheck.limit,
                search_limit: searchLimit,
                pro_until: proUntil,
            },
            invite_applied: inviteApplied,
        });
    } catch (error) {
        console.error("Status API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
