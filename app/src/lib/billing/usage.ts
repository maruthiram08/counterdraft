import { supabaseAdmin } from '@/lib/supabase-admin';
import { PRICING_CONFIG, Tier } from '@/lib/constants/pricing';
import { isSubscriptionLive } from '@/lib/billing/plans';

export class UsageService {

    /**
     * Check if user can generate an image.
     */
    static async checkImageLimit(userId: string) {
        return this._checkLimitGeneric(userId, 'image_count', 'IMAGES_PER_MONTH', 'images');
    }

    static async incrementImageCount(userId: string) {
        return this._incrementGeneric(userId, 'image_count');
    }

    /**
     * Check a plan feature flag (e.g. belief and tension tracking) rather than a monthly count.
     */
    static async checkFeature(userId: string, feature: 'ALLOW_BELIEFS' | 'ALLOW_TENSIONS') {
        const { data: user } = await supabaseAdmin.from('users').select('subscription_status, subscription_plan').eq('id', userId).maybeSingle();
        const tier = await this.resolveTier(userId, user);
        return { allowed: PRICING_CONFIG.LIMITS[tier][feature], tier };
    }

    // Subscriptions table (V2) first, then the users table (V1)
    private static async resolveTier(
        userId: string,
        userMeta?: { subscription_status?: string | null; subscription_plan?: string | null } | null
    ): Promise<Tier> {
        const { data: sub } = await supabaseAdmin.from('subscriptions').select('plan_id, status, current_period_end').eq('user_id', userId).eq('status', 'active').maybeSingle();
        if (isSubscriptionLive(sub)) return PRICING_CONFIG.TIERS.PRO;
        if (userMeta?.subscription_status === 'active' && userMeta?.subscription_plan?.includes('pro')) return PRICING_CONFIG.TIERS.PRO;
        return PRICING_CONFIG.TIERS.FREE;
    }

    // --- GENERIC HELPERS ---

    private static async _checkLimitGeneric(
        userId: string,
        usageColumn: 'draft_count' | 'search_count' | 'image_count',
        configKey: keyof typeof PRICING_CONFIG.LIMITS['free'],
        resourceName: string
    ) {
        const supabase = supabaseAdmin;
        type UsageRow = {
            users?: {
                subscription_status?: string | null;
                subscription_plan?: string | null;
            };
            [key: string]: unknown;
        };

        // 1. Get Usage & Tier
        // We do a joined query to get the User's Subscription status efficiently
        const { data: initialUsage, error } = await supabase
            .from('user_usage')
            .select('*, users!inner(subscription_status, subscription_plan)')
            .eq('user_id', userId)
            .single();
        let usage = initialUsage as UsageRow | null;

        if (error || !usage) {
            // Lazy Init if missing
            const { data: newUsage } = await supabase.from('user_usage').insert({ user_id: userId }).select('*, users!inner(subscription_status, subscription_plan)').single();
            usage = (newUsage || null) as UsageRow | null;
        }

        if (!usage) return { allowed: false, reason: "System error loading usage." };

        // 2. Determine Effective Tier
        const effectiveTier = await this.resolveTier(userId, usage.users);

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
            const row = data as unknown as Record<string, unknown>;
            const current = typeof row[column] === 'number' ? (row[column] as number) : 0;
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

    /**
     * Log a performance metric to the console (for Vercel/Datadog pickup).
     */
    static logPerformance(event: string, meta: Record<string, unknown>) {
        console.log(JSON.stringify({
            _type: 'metric',
            event,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    }
}
