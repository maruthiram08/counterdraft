import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';
import { PRICING_CONFIG, Tier } from '@/lib/constants/pricing';

export async function GET(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('onboarding_completed, role, context, voice_tone')
            .eq('id', userId)
            .single();

        if (error || !user) {
            // If user missing, default to false
            return NextResponse.json({ onboarding_completed: false });
        }

        // Check Limits
        const limitCheck = await UsageService.checkDraftLimit(userId);

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
            }
        });
    } catch (error) {
        console.error("Status API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
