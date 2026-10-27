import { PRICING_CONFIG } from '@/lib/constants/pricing';

// Paid plans sold through Razorpay. Amounts are in the smallest currency unit (paise / cents).
// Each id must also exist in the access_plans table (subscriptions.plan_id references it).
export type PaidPlan = { amount: number; currency: 'INR' | 'USD'; months: number };

export const PAID_PLANS: Record<string, PaidPlan> = {
    [PRICING_CONFIG.PLANS.INDIA.MONTHLY]: { amount: 999_00, currency: 'INR', months: 1 },
    [PRICING_CONFIG.PLANS.INDIA.YEARLY]: { amount: 9_999_00, currency: 'INR', months: 12 },
    [PRICING_CONFIG.PLANS.GLOBAL.MONTHLY]: { amount: 29_00, currency: 'USD', months: 1 },
    [PRICING_CONFIG.PLANS.GLOBAL.YEARLY]: { amount: 290_00, currency: 'USD', months: 12 },
};

// Plans that unlock Pro. Matched exactly (a substring check on "pro" also matched "prod_...").
export const PRO_PLAN_IDS: ReadonlySet<string> = new Set([
    'pro_beta_2026', // invite / coupon plan
    ...Object.keys(PAID_PLANS),
]);

export function isProPlan(planId: string | null | undefined): boolean {
    return !!planId && PRO_PLAN_IDS.has(planId);
}

/** A subscription counts only while active and not past its end date (no end date = no expiry, e.g. manual grants). */
export function isSubscriptionLive(
    sub: { status?: string | null; plan_id?: string | null; current_period_end?: string | null } | null | undefined,
    now: Date = new Date()
): boolean {
    if (!sub || sub.status !== 'active' || !isProPlan(sub.plan_id)) return false;
    if (!sub.current_period_end) return true;
    return new Date(sub.current_period_end).getTime() > now.getTime();
}

export function periodEndFrom(start: Date, months: number): Date {
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    return end;
}
