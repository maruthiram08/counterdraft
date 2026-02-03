import { supabaseAdmin } from '@/lib/supabase-admin';
import { PRICING_CONFIG, Tier } from '@/lib/constants/pricing';

export class UsageService {

    /**
     * Check if a user can create a new draft.
     * Uses the optimized 'user_usage' table.
     */
    static async checkDraftLimit(userId: string) {
        const supabase = supabaseAdmin;

        // 1. Get Usage Record (Lazy Create if missing)
        // Join with users table to get real-time subscription status
        let { data: usage, error } = await supabase
            .from('user_usage')
            .select('*, users!inner(subscription_status, subscription_plan)')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Record missing, create it
            const { data: newUsage, error: createError } = await supabase
                .from('user_usage')
                .insert({ user_id: userId, plan_tier: 'free' }) // Default to free, sync later
                .select('*, users!inner(subscription_status, subscription_plan)') // Ensure we select the joined data
                .single();

            if (createError) {
                console.error("Error creating usage record:", createError);
                return { allowed: false, reason: "System error initializing usage." };
            }
            usage = newUsage;
        }

        // 2. Determine Tier & Limit
        // CHECK NEW SUBSCRIPTIONS TABLE
        let effectiveTier: Tier = PRICING_CONFIG.TIERS.FREE;

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (subscription && subscription.status === 'active') {
            // Map 'pro_beta_2026' -> 'PRO'
            if (subscription.plan_id.includes('pro')) {
                effectiveTier = PRICING_CONFIG.TIERS.PRO;
            }
        } else {
            // FALLBACK: Legacy check on users table (if needed during migration)
            const userSub = (usage as any).users;
            if (userSub && userSub.subscription_status === 'active') {
                if (userSub.subscription_plan?.includes('pro')) {
                    effectiveTier = PRICING_CONFIG.TIERS.PRO;
                }
            }
        }

        const limit = PRICING_CONFIG.LIMITS[effectiveTier].DRAFTS_PER_MONTH;

        if (limit === Infinity) {
            return { allowed: true, tier: effectiveTier, usage: usage.draft_count, limit: Infinity };
        }

        // 3. Check Reset (Monthly)
        const lastReset = new Date(usage.last_reset_date);
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);

        if (lastReset < oneMonthAgo) {
            // Time to reset!
            await supabase.from('user_usage').update({ draft_count: 0, last_reset_date: now.toISOString() }).eq('user_id', userId);
            usage.draft_count = 0; // Local update
        }

        // 4. Check Limit
        if (usage.draft_count >= limit) {
            return {
                allowed: false,
                reason: `Monthly limit of ${limit} drafts reached.`,
                usage: usage.draft_count,
                tier: effectiveTier,
                limit
            };
        }

        return { allowed: true, usage: usage.draft_count, tier: effectiveTier, limit };
    }

    /**
     * Increment the draft count for a user.
     * Call this AFTER successfully creating a draft.
     */
    static async incrementDraftCount(userId: string) {
        const supabase = supabaseAdmin;

        // Atomic increment
        const { error } = await supabase.rpc('increment_draft_count', { user_id_param: userId });

        // Fallback if RPC missing (V1 hack: read-update)
        if (error) {
            // Just specific update
            const { data: current } = await supabase.from('user_usage').select('draft_count').eq('user_id', userId).single();
            if (current) {
                await supabase.from('user_usage').update({ draft_count: current.draft_count + 1 }).eq('user_id', userId);
            }
        }
    }

    /**
     * Get features for the current user (helper).
     */
    static async getTierFeatures(userId: string) {
        const check = await this.checkDraftLimit(userId);
        // Map the tier string back to limits
        // This is a bit circular but ensures we use the same Source of Truth (user_usage table)
        return PRICING_CONFIG.LIMITS[check.tier as Tier];
    }
    /**
     * Check if a user can perform a search.
     */
    static async checkSearchLimit(userId: string) {
        const supabase = supabaseAdmin;

        // 1. Get Usage
        let { data: usage, error } = await supabase
            .from('user_usage')
            .select('*, users!inner(subscription_status, subscription_plan)')
            .eq('user_id', userId)
            .single();

        if (error || !usage) {
            // Handle missing/error same as draft (lazy create or fail)
            // simplified for brevity, assuming draft check usually runs first or parallel
            return { allowed: false, reason: "Usage record not found" };
        }

        // 2. Determine Tier & Limit
        let effectiveTier: Tier = PRICING_CONFIG.TIERS.FREE;

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (subscription && subscription.status === 'active') {
            if (subscription.plan_id.includes('pro')) {
                effectiveTier = PRICING_CONFIG.TIERS.PRO;
            }
        } else {
            const userSub = (usage as any).users;
            if (userSub && userSub.subscription_status === 'active') {
                if (userSub.subscription_plan?.includes('pro')) {
                    effectiveTier = PRICING_CONFIG.TIERS.PRO;
                }
            }
        }

        const tier = effectiveTier; // Alias for cleaner return
        const limit = PRICING_CONFIG.LIMITS[tier].SEARCHES_PER_MONTH || 20;

        if (limit === Infinity) {
            return { allowed: true, tier, usage: usage.search_count || 0, limit: Infinity };
        }

        // 3. Check Limit
        const currentCount = usage.search_count || 0;
        if (currentCount >= limit) {
            return {
                allowed: false,
                reason: `Monthly limit of ${limit} searches reached.`,
                usage: currentCount,
                tier,
                limit
            };
        }

        return { allowed: true, usage: currentCount, tier, limit };
    }

    /**
     * Increment search count. 
     */
    static async incrementSearchCount(userId: string) {
        const supabase = supabaseAdmin;

        // Try RPC first (if migrated)
        const { error } = await supabase.rpc('increment_search_count', { user_id_param: userId });

        if (error) {
            // Fallback: Read-Update
            const { data: current } = await supabase.from('user_usage').select('search_count').eq('user_id', userId).single();
            if (current) {
                await supabase.from('user_usage').update({ search_count: (current.search_count || 0) + 1 }).eq('user_id', userId);
            }
        }
    }
}
