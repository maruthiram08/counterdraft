import { isProPlan, isSubscriptionLive, periodEndFrom, PAID_PLANS } from '@/lib/billing/plans';

describe('billing plans', () => {
    const now = new Date('2026-10-27T12:00:00Z');

    it('matches Pro plans exactly, not by substring', () => {
        expect(isProPlan('prod_in_monthly')).toBe(true);
        expect(isProPlan('prod_gl_yearly')).toBe(true);
        expect(isProPlan('pro_beta_2026')).toBe(true);
        expect(isProPlan('prod_something_else')).toBe(false);
        expect(isProPlan('pro_monthly')).toBe(false);
        expect(isProPlan(null)).toBe(false);
    });

    it('counts an active subscription only until its end date', () => {
        const base = { status: 'active', plan_id: 'prod_in_monthly' };
        expect(isSubscriptionLive({ ...base, current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(true);
        expect(isSubscriptionLive({ ...base, current_period_end: '2026-10-01T00:00:00Z' }, now)).toBe(false);
        expect(isSubscriptionLive({ ...base, current_period_end: null }, now)).toBe(true);
        expect(isSubscriptionLive({ ...base, status: 'cancelled', current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(false);
        expect(isSubscriptionLive(null, now)).toBe(false);
    });

    it('prices India in paise and Global in cents', () => {
        expect(PAID_PLANS.prod_in_monthly).toMatchObject({ amount: 99900, currency: 'INR', months: 1 });
        expect(PAID_PLANS.prod_in_yearly).toMatchObject({ amount: 999900, currency: 'INR', months: 12 });
        expect(PAID_PLANS.prod_gl_monthly).toMatchObject({ amount: 2900, currency: 'USD', months: 1 });
        expect(PAID_PLANS.prod_gl_yearly).toMatchObject({ amount: 29000, currency: 'USD', months: 12 });
    });

    it('adds whole months for the period end', () => {
        expect(periodEndFrom(now, 1).toISOString()).toBe('2026-11-27T12:00:00.000Z');
        expect(periodEndFrom(now, 12).toISOString()).toBe('2027-10-27T12:00:00.000Z');
    });
});
