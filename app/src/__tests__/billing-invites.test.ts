/**
 * @jest-environment node
 */
import { inviteState, normalizeInviteCode, inviteAuthUrl } from '@/lib/billing/invite-utils';

// A tiny fake of the Supabase query builder: each table returns the row we give it,
// and writes are recorded so tests can check what was changed
type Row = Record<string, unknown> | null;
const tables: Record<string, Row> = {};
const writes: { table: string; op: string; values: unknown }[] = [];

function builder(table: string) {
    let op = 'select';
    let values: unknown;
    const q: Record<string, unknown> = {};
    const chain = () => q;
    Object.assign(q, {
        select: chain, eq: chain, lt: chain, ilike: chain, not: chain, limit: chain,
        update: (v: unknown) => { op = 'update'; values = v; return q; },
        upsert: (v: unknown) => { writes.push({ table, op: 'upsert', values: v }); return Promise.resolve({ error: null }); },
        maybeSingle: async () => {
            if (op === 'update') { writes.push({ table, op, values }); return { data: { code: 'x' }, error: null }; }
            return { data: tables[table] ?? null, error: null };
        },
        single: async () => ({ data: tables[table] ?? null, error: null }),
    });
    return q;
}

jest.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }));

import { claimInvite, applyApprovedInvite } from '@/lib/billing/invites';

const invite = (over: Record<string, unknown> = {}) => ({
    code: 'BETA-ABCDEFGH23', plan_id: 'pro_beta_2026', discount_percent: 100,
    max_redemptions: 1, redemptions_count: 0, expires_at: '2026-11-11T00:00:00Z', ...over,
});

describe('invite states', () => {
    const now = new Date('2026-10-28T12:00:00Z');

    it('tells valid, used, expired, discount and missing apart', () => {
        expect(inviteState(invite(), now)).toBe('valid');
        expect(inviteState(invite({ redemptions_count: 1 }), now)).toBe('used');
        expect(inviteState(invite({ expires_at: '2026-10-01T00:00:00Z' }), now)).toBe('expired');
        expect(inviteState(invite({ expires_at: '2026-10-01T00:00:00Z', redemptions_count: 1 }), now)).toBe('expired');
        expect(inviteState(invite({ discount_percent: 20 }), now)).toBe('discount');
        expect(inviteState(null, now)).toBe('missing');
        expect(inviteState(invite({ expires_at: null }), now)).toBe('valid');
    });

    it('cleans up typed codes', () => {
        expect(normalizeInviteCode(' beta-abc%20 ')).toBe('BETA-ABC');
        expect(normalizeInviteCode('%E0%A4%A')).toBe('%E0%A4%A');
    });

    it('carries the code through sign-up and back into the app', () => {
        expect(inviteAuthUrl('sign-up', 'BETA-X')).toBe('/sign-up?redirect_url=%2Fworkspace%3Finvite%3DBETA-X');
    });
});

describe('claimInvite', () => {
    beforeEach(() => {
        writes.length = 0;
        tables.coupons = invite({ expires_at: null });
        tables.access_plans = { id: 'pro_beta_2026', display_name: 'Pro (Beta)', validity_days: 30 };
        tables.subscriptions = null;
        tables.beta_requests = null;
    });

    it('takes one use and gives Pro for the plan length', async () => {
        const result = await claimInvite('u1', 'beta-abcdefgh23');
        expect(result.ok).toBe(true);
        expect(writes.map(w => `${w.table}:${w.op}`)).toEqual(['coupons:update', 'subscriptions:upsert']);
        const days = (new Date((result as { periodEnd: string }).periodEnd).getTime() - Date.now()) / 86_400_000;
        expect(Math.round(days)).toBe(30);
    });

    it('does not burn the invite for someone already on Pro for longer', async () => {
        tables.subscriptions = { status: 'active', plan_id: 'pro_beta_2026', current_period_end: '2099-01-01T00:00:00Z' };
        const result = await claimInvite('u1', 'BETA-ABCDEFGH23');
        expect(result).toMatchObject({ ok: false, code: 'already_pro' });
        expect(writes).toEqual([]);
    });

    it('refuses used invites with a plain message', async () => {
        tables.coupons = invite({ redemptions_count: 1, expires_at: null });
        expect(await claimInvite('u1', 'BETA-ABCDEFGH23')).toMatchObject({ ok: false, code: 'used', status: 409 });
    });

    it('applies an approved request invite by email, and does nothing without one', async () => {
        expect(await applyApprovedInvite('u1', 'priya@lumen.io')).toBeNull();
        tables.beta_requests = { invite_code: 'BETA-ABCDEFGH23' };
        expect(await applyApprovedInvite('u1', 'priya@lumen.io')).toEqual(expect.any(String));
        expect(await applyApprovedInvite('u1', null)).toBeNull();
    });
});
