import { supabaseAdmin } from '@/lib/supabase-admin';
import { PRICING_CONFIG, Tier } from '@/lib/constants/pricing';

export class UsageService {

    /**
     * Check if a user can create a new draft.
     * Uses the optimized 'user_usage' table.
     */
    /**
     * Check if user can generate an image.
     */
    static async checkImageLimit(userId: string) {
        return this._checkLimitGeneric(userId, 'image_count', 'IMAGES_PER_MONTH', 'images');
    }

    static async incrementImageCount(userId: string) {
        return this._incrementGeneric(userId, 'image_count');
    }

    // --- GENERIC HELPERS ---

    private static async _checkLimitGeneric(
        userId: string,
        usageColumn: 'draft_count' | 'search_count' | 'image_count',
        configKey: keyof typeof PRICING_CONFIG.LIMITS['free'],
        resourceName: string
    ) {
        const supabase = supabaseAdmin;

        // 1. Get Usage & Tier
        // We do a joined query to get the User's Subscription status efficiently
        let { data: usage, error } = await supabase
            .from('user_usage')
            .select('*, users!inner(subscription_status, subscription_plan)')
            .eq('user_id', userId)
            .single();

        if (error || !usage) {
            // Lazy Init if missing
            const { data: newUsage } = await supabase.from('user_usage').insert({ user_id: userId }).select('*, users!inner(subscription_status, subscription_plan)').single();
            usage = newUsage!;
        }

        if (!usage) return { allowed: false, reason: "System error loading usage." };

        // 2. Determine Effective Tier
        // Logic: Check Subscriptions Table (V2) -> Fallback to Users Table (V1)
        let effectiveTier: Tier = PRICING_CONFIG.TIERS.FREE;

        // V2 Check
        const { data: sub } = await supabase.from('subscriptions').select('plan_id, status').eq('user_id', userId).eq('status', 'active').maybeSingle();
        if (sub && sub.plan_id.includes('pro')) {
            effectiveTier = PRICING_CONFIG.TIERS.PRO;
        }
        // V1 Fallback
        else {
            const userMeta = (usage as any).users;
            if (userMeta?.subscription_status === 'active' && userMeta?.subscription_plan?.includes('pro')) {
                effectiveTier = PRICING_CONFIG.TIERS.PRO;
            }
        }

        // 3. Check Limit
        const limit = PRICING_CONFIG.LIMITS[effectiveTier][configKey];
        if (typeof limit !== 'number') return { allowed: true, tier: effectiveTier, usage: 0, limit: Infinity }; // Should not happen for counts

        const currentUsage = (usage[usageColumn] as number) || 0;

        if (limit !== Infinity && currentUsage >= limit) {
            return {
                allowed: false,
                reason: `Monthly limit of ${limit} ${resourceName} reached.`,
                usage: currentUsage,
                tier: effectiveTier,
                limit
            };
        }

        return { allowed: true, usage: currentUsage, tier: effectiveTier, limit };
    }

    private static async _incrementGeneric(userId: string, column: string) {
        const supabase = supabaseAdmin;
        // Try simple read-update since RPCs might be missing
        const { data } = await supabase.from('user_usage').select(column).eq('user_id', userId).single();
        if (data) {
            const current = (data as any)[column] || 0;
            await supabase.from('user_usage').update({ [column]: current + 1 }).eq('user_id', userId);
        }
    }

    // Refactored Wrappers
    static async checkDraftLimit(userId: string) {
        return this._checkLimitGeneric(userId, 'draft_count', 'DRAFTS_PER_MONTH', 'drafts');
    }

    static async checkSearchLimit(userId: string) {
        return this._checkLimitGeneric(userId, 'search_count', 'SEARCHES_PER_MONTH', 'searches');
    }

    // ... increment wrappers ...
    static async incrementDraftCount(userId: string) { return this._incrementGeneric(userId, 'draft_count'); }
    static async incrementSearchCount(userId: string) { return this._incrementGeneric(userId, 'search_count'); }

    // Helper to get features (exposed for UI)
    static async getTierFeatures(userId: string) {
        const check = await this.checkDraftLimit(userId);
        return PRICING_CONFIG.LIMITS[check.tier as Tier];
    }
}

