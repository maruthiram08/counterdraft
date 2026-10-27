/**
 * @jest-environment node
 */
import crypto from 'crypto';

jest.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));
const grantPaidPlan = jest.fn(async () => ({ alreadyGranted: false }));
jest.mock('@/lib/billing/provision', () => ({ grantPaidPlan: (...args: unknown[]) => grantPaidPlan(...(args as [])) }));

import { checkCoupon, isFreeInvite } from '@/lib/billing/coupons';
import { discountedAmount, formatAmount } from '@/lib/billing/plans';
import { POST as razorpayWebhook } from '@/app/api/webhooks/razorpay/route';

const coupon = (over: Record<string, unknown> = {}) => ({
    code: 'LAUNCH20', plan_id: 'pro_beta_2026', discount_percent: 20,
    max_redemptions: 10, redemptions_count: 0, expires_at: null, ...over,
});

describe('discount coupons', () => {
    const now = new Date('2026-10-27T12:00:00Z');

    it('accepts a live discount code', () => {
        expect(checkCoupon(coupon(), now)).toEqual({ ok: true, discountPercent: 20 });
    });

    it('rejects missing, expired, used-up and free-invite codes', () => {
        expect(checkCoupon(null, now).ok).toBe(false);
        expect(checkCoupon(coupon({ expires_at: '2026-10-01T00:00:00Z' }), now).ok).toBe(false);
        expect(checkCoupon(coupon({ redemptions_count: 10 }), now).ok).toBe(false);
        expect(checkCoupon(coupon({ discount_percent: 100 }), now).ok).toBe(false);
        expect(isFreeInvite({ discount_percent: null })).toBe(true);
    });

    it('works out the discounted price in minor units', () => {
        expect(discountedAmount(99900, 20)).toBe(79900);
        expect(discountedAmount(2900, 50)).toBe(1500);
        expect(discountedAmount(2900, 99)).toBe(100); // never below 1 rupee / dollar
        expect(formatAmount(79900, 'INR')).toBe('₹799');
        expect(formatAmount(1450, 'USD')).toBe('$14.50');
        expect(formatAmount(2900, 'USD')).toBe('$29');
    });
});

describe('Razorpay order.paid webhook', () => {
    const secret = 'whsec_test';
    beforeEach(() => { process.env.RP_WEBHOOK_SECRET = secret; grantPaidPlan.mockClear(); });

    const call = (body: object, sign = true) => {
        const raw = JSON.stringify(body);
        const sig = sign ? crypto.createHmac('sha256', secret).update(raw).digest('hex') : 'bad';
        return razorpayWebhook(new Request('https://counterdraft.com/api/webhooks/razorpay', {
            method: 'POST', body: raw, headers: { 'x-razorpay-signature': sig },
        }) as never);
    };

    const paid = {
        event: 'order.paid',
        payload: { order: { entity: { id: 'order_1', notes: { userId: 'u1', planId: 'prod_in_monthly', couponCode: 'LAUNCH20' } } } },
    };

    it('grants Pro from the order notes', async () => {
        const res = await call(paid);
        expect(res.status).toBe(200);
        expect(grantPaidPlan).toHaveBeenCalledWith({ userId: 'u1', planId: 'prod_in_monthly', orderId: 'order_1', couponCode: 'LAUNCH20' });
    });

    it('rejects a bad signature', async () => {
        const res = await call(paid, false);
        expect(res.status).toBe(401);
        expect(grantPaidPlan).not.toHaveBeenCalled();
    });

    it('ignores other events', async () => {
        const res = await call({ event: 'payment.failed', payload: {} });
        expect(res.status).toBe(200);
        expect(grantPaidPlan).not.toHaveBeenCalled();
    });
});
