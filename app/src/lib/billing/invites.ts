import { supabaseAdmin } from '@/lib/supabase-admin';
import { isSubscriptionLive } from '@/lib/billing/plans';
import type { CouponRow } from '@/lib/billing/coupons';
import { inviteState, normalizeInviteCode } from '@/lib/billing/invite-utils';

export type ClaimResult =
    | { ok: true; planId: string; planName: string; periodEnd: string }
    | { ok: false; status: number; code: 'missing' | 'expired' | 'used' | 'discount' | 'already_pro' | 'error'; error: string; periodEnd?: string | null };

const CLAIM_ERRORS: Record<'missing' | 'expired' | 'used' | 'discount', { status: number; error: string }> = {
    missing: { status: 404, error: "We couldn't find that invite code. Check it and try again." },
    expired: { status: 410, error: 'This invite has expired. Ask for a new one.' },
    used: { status: 409, error: 'This invite has already been used. Each invite works once.' },
    discount: { status: 400, error: 'This is a discount code. Use it on the Pricing page.' },
};

/** Redeem a free invite for a user: one use off the coupon, then Pro for the plan's validity. */
export async function claimInvite(userId: string, rawCode: string): Promise<ClaimResult> {
    const code = normalizeInviteCode(rawCode);

    const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('code, plan_id, discount_percent, max_redemptions, redemptions_count, expires_at')
        .eq('code', code)
        .maybeSingle();

    const state = inviteState(coupon as CouponRow | null);
    if (state !== 'valid') return { ok: false, code: state, ...CLAIM_ERRORS[state] };

    // Don't burn an invite on someone who already has Pro for longer
    const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status, plan_id, current_period_end, coupon_code')
        .eq('user_id', userId)
        .maybeSingle();

    const { data: plan } = await supabaseAdmin.from('access_plans').select('id, display_name, validity_days').eq('id', coupon!.plan_id).single();
    if (!plan) return { ok: false, status: 500, code: 'error', error: "This invite isn't set up right. Ask the person who sent it." };

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (plan.validity_days || 30));

    if (isSubscriptionLive(sub)) {
        const currentEnd = sub!.current_period_end ? new Date(sub!.current_period_end) : null;
        if (!currentEnd || currentEnd >= endDate) {
            return {
                ok: false, status: 409, code: 'already_pro', periodEnd: sub!.current_period_end ?? null,
                error: "You're already on Pro, so this invite wasn't used. Pass it on to someone else.",
            };
        }
    }

    // Take one use, guarded so two people can't take the last one at once
    const { data: updated, error: updateError } = await supabaseAdmin
        .from('coupons')
        .update({ redemptions_count: (coupon!.redemptions_count ?? 0) + 1 })
        .eq('code', code)
        .lt('redemptions_count', coupon!.max_redemptions ?? 1)
        .select('code')
        .maybeSingle();
    if (updateError || !updated) return { ok: false, code: 'used', ...CLAIM_ERRORS.used };

    const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
            user_id: userId,
            plan_id: plan.id,
            status: 'active',
            source: 'coupon',
            coupon_code: code,
            start_date: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
        });
    if (subError) {
        console.error('[claimInvite] subscription upsert failed:', subError);
        return { ok: false, status: 500, code: 'error', error: "We couldn't turn on Pro. Try again in a minute." };
    }

    return { ok: true, planId: plan.id, planName: plan.display_name || 'Pro', periodEnd: endDate.toISOString() };
}

/**
 * Approved beta requests carry their invite code. When someone signs up with the email they
 * requested access with, apply that invite even if they never opened the link in this browser.
 * Returns the new Pro end date, or null when there was nothing to apply.
 */
export async function applyApprovedInvite(userId: string, email: string | null | undefined): Promise<string | null> {
    if (!email) return null;
    const { data: request, error } = await supabaseAdmin
        .from('beta_requests')
        .select('invite_code')
        .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`))
        .eq('status', 'approved')
        .not('invite_code', 'is', null)
        .limit(1)
        .maybeSingle();
    // Column missing (migration not run yet) or no approved request: nothing to do
    if (error || !request?.invite_code) return null;

    const result = await claimInvite(userId, request.invite_code);
    return result.ok ? result.periodEnd : null;
}
