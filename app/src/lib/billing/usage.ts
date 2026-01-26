import { supabaseAdmin } from '@/lib/supabase-admin';
import { PRICING_CONFIG, Tier } from '@/lib/constants/pricing';

export class UsageService {

    /**
     * Check if a user can create a new draft based on their plan limits.
     * Returns { allowed: boolean, reason?: string, usage?: number, limit?: number }
     */
    static async checkDraftLimit(userId: string) {
        const supabase = supabaseAdmin;

        // 1. Get User Subscription Status
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('status, plan_id')
            .eq('user_id', userId)
            .single();

        // Default to FREE if no record
        const isPro = sub?.status === 'active';
        const tier: Tier = isPro ? PRICING_CONFIG.TIERS.PRO : PRICING_CONFIG.TIERS.FREE;
        const limit = PRICING_CONFIG.LIMITS[tier].DRAFTS_PER_MONTH;

        // If unlimited, return early
        if (limit === Infinity) {
            return { allowed: true, tier, usage: 0, limit: Infinity };
        }

        // 2. Count Drafts Created This Month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
            .from('drafts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth.toISOString());

        if (error) {
            console.error("Error checking draft limit:", error);
            // Fail open (allow) or closed (deny)? Failing closed for safety, but logging.
            return { allowed: false, reason: "System error checking limits", tier };
        }

        const usage = count || 0;

        if (usage >= limit) {
            return {
                allowed: false,
                reason: "Monthly draft limit reached.",
                usage,
                limit
            };
        }

        return { allowed: true, usage, tier, limit };
    }

    /**
     * Get the Feature Flags for the current user's tier.
     * Useful for the Brain API to decide whether to redact deep data.
     */
    static async getTierFeatures(userId: string) {
        const supabase = supabaseAdmin;

        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('status')
            .eq('user_id', userId)
            .single();

        const isPro = sub?.status === 'active';
        const tier: Tier = isPro ? PRICING_CONFIG.TIERS.PRO : PRICING_CONFIG.TIERS.FREE;

        return PRICING_CONFIG.LIMITS[tier];
    }
}
