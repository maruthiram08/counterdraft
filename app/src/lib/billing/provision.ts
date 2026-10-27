import { supabaseAdmin } from '@/lib/supabase-admin';
import { PAID_PLANS, periodEndFrom } from '@/lib/billing/plans';

/**
 * Grant Pro for a paid Razorpay order. Safe to call more than once for the same order
 * (the browser's verify call and the order.paid webhook both land here).
 */
export async function grantPaidPlan(params: { userId: string; planId: string; orderId: string; couponCode?: string | null }) {
    const { userId, planId, orderId, couponCode } = params;
    const paidPlan = PAID_PLANS[planId];
    if (!paidPlan) throw new Error(`Unknown plan on a paid order: ${planId}`);

    const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    // Same order already provisioned
    if (existingSub?.subscription_id === orderId && existingSub?.status === 'active') {
        return { alreadyGranted: true };
    }

    // Paying again before the current period ends extends it instead of throwing away the remaining days
    const now = new Date();
    const currentEnd = existingSub?.status === 'active' && existingSub?.current_period_end ? new Date(existingSub.current_period_end) : null;
    const endDate = periodEndFrom(currentEnd && currentEnd > now ? currentEnd : now, paidPlan.months);

    const fields = {
        status: 'active',
        plan_id: planId,
        current_period_end: endDate.toISOString(),
        provider: 'razorpay',
        source: 'razorpay',
        subscription_id: orderId, // Order id doubles as the idempotency key
        coupon_code: couponCode || null,
    };

    const { error } = existingSub
        ? await supabaseAdmin.from('subscriptions').update(fields).eq('user_id', userId)
        : await supabaseAdmin.from('subscriptions').insert({ user_id: userId, ...fields });
    if (error) {
        // The webhook and the browser's verify call can race to create the first row for this order
        if (error.code === '23505') {
            const { data: raced } = await supabaseAdmin.from('subscriptions').select('subscription_id, status').eq('user_id', userId).maybeSingle();
            if (raced?.subscription_id === orderId && raced?.status === 'active') return { alreadyGranted: true };
        }
        throw error;
    }

    // Count the discount code only once the payment went through
    if (couponCode) {
        const { data: coupon } = await supabaseAdmin.from('coupons').select('redemptions_count').eq('code', couponCode).maybeSingle();
        if (coupon) {
            await supabaseAdmin
                .from('coupons')
                .update({ redemptions_count: (coupon.redemptions_count ?? 0) + 1 })
                .eq('code', couponCode)
                .eq('redemptions_count', coupon.redemptions_count ?? 0);
        }
    }

    return { alreadyGranted: false, currentPeriodEnd: endDate.toISOString() };
}
