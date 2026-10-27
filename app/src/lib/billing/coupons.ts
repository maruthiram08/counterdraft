import { supabaseAdmin } from '@/lib/supabase-admin';
import { PAID_PLANS, discountedAmount } from '@/lib/billing/plans';

export type CouponRow = {
    code: string;
    plan_id: string | null;
    discount_percent: number | null;
    max_redemptions: number | null;
    redemptions_count: number | null;
    expires_at: string | null;
};

// Coupons at 100% are free invites (claimed through /invite); anything less is a discount at checkout
export function isFreeInvite(coupon: Pick<CouponRow, 'discount_percent'>): boolean {
    return (coupon.discount_percent ?? 100) >= 100;
}

export type CouponCheck =
    | { ok: true; discountPercent: number }
    | { ok: false; reason: string };

export function checkCoupon(coupon: CouponRow | null, now: Date = new Date()): CouponCheck {
    if (!coupon) return { ok: false, reason: 'That code is not valid.' };
    if (coupon.expires_at && new Date(coupon.expires_at) < now) return { ok: false, reason: 'That code has expired.' };
    if ((coupon.redemptions_count ?? 0) >= (coupon.max_redemptions ?? 1)) return { ok: false, reason: 'That code has been fully used.' };
    if (isFreeInvite(coupon)) return { ok: false, reason: 'That is an invite code. Open your invite link to use it.' };
    const discountPercent = Math.round(coupon.discount_percent ?? 0);
    if (discountPercent <= 0) return { ok: false, reason: 'That code has no discount.' };
    return { ok: true, discountPercent };
}

export async function loadCoupon(code: string): Promise<CouponRow | null> {
    const { data } = await supabaseAdmin
        .from('coupons')
        .select('code, plan_id, discount_percent, max_redemptions, redemptions_count, expires_at')
        .eq('code', code.trim().toUpperCase())
        .maybeSingle();
    return (data as CouponRow | null) ?? null;
}

/** Price for a plan with an optional discount code. */
export async function priceWithCoupon(planId: string, code?: string | null) {
    const plan = PAID_PLANS[planId];
    if (!plan) return { error: 'Invalid plan ID' as const };
    if (!code) return { plan, amount: plan.amount, couponCode: null, discountPercent: 0 };

    const coupon = await loadCoupon(code);
    const check = checkCoupon(coupon);
    if (!check.ok) return { error: check.reason };
    return {
        plan,
        amount: discountedAmount(plan.amount, check.discountPercent),
        couponCode: coupon!.code,
        discountPercent: check.discountPercent,
    };
}
