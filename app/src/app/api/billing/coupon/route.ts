import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { priceWithCoupon } from '@/lib/billing/coupons';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

// Preview a discount code on the Pricing page. The order API re-checks it before charging.
export async function POST(req: NextRequest) {
    const userId = await getOrCreateUser();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = rateLimit(`coupon-check:${userId || getClientIp(req)}`, { windowMs: 15 * 60 * 1000, max: 20 });
    if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
    }

    const { planId, code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Enter a code.' }, { status: 400 });

    const priced = await priceWithCoupon(String(planId ?? ''), String(code));
    if ('error' in priced) return NextResponse.json({ error: priced.error }, { status: 400 });

    return NextResponse.json({
        code: priced.couponCode,
        discountPercent: priced.discountPercent,
        amount: priced.amount,
        currency: priced.plan.currency,
    });
}
