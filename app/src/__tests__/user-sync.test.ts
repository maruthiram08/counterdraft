type Row = Record<string, unknown>;
const rows: Row[] = [];

// Minimal in-memory stand-in for the supabase query builder calls user-sync makes
function from() {
    let filters: ((r: Row) => boolean)[] = [];
    let patch: Row | null = null;
    let insertRow: Row | null = null;
    const matches = () => rows.filter(r => filters.every(f => f(r)));
    const run = () => {
        if (insertRow) {
            const row = { id: `u${rows.length + 1}`, updated_at: new Date().toISOString(), ...insertRow };
            rows.push(row);
            return { data: row, error: null };
        }
        if (patch) {
            matches().forEach(r => Object.assign(r, patch));
            return { data: null, error: null };
        }
        return { data: matches()[0] ?? null, error: null };
    };
    const q = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters.push(r => r[k] === v); return q; },
        ilike: (k: string, v: string) => {
            const plain = v.replace(/\\(.)/g, '$1').toLowerCase();
            filters.push(r => String(r[k] ?? '').toLowerCase() === plain);
            return q;
        },
        order: () => q,
        limit: () => q,
        update: (p: Row) => { patch = p; return q; },
        insert: (p: Row) => { insertRow = p; return q; },
        maybeSingle: async () => run(),
        single: async () => run(),
        then: (resolve: (v: unknown) => void) => resolve(run()),
    };
    filters = [];
    return q;
}

jest.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from } }));
jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn(), currentUser: jest.fn() }));

import { isPlaceholderEmail, linkOrCreateUser, pickVerifiedEmail } from '@/lib/user-sync';

describe('user-sync', () => {
    beforeEach(() => { rows.length = 0; });

    it('recognises placeholder emails', () => {
        expect(isPlaceholderEmail('clerk_user_abc@counterdraft.app')).toBe(true);
        expect(isPlaceholderEmail(null)).toBe(true);
        expect(isPlaceholderEmail('maruthi@example.com')).toBe(false);
    });

    it('only picks verified emails, preferring the primary one', () => {
        const emails = [
            { id: 'e1', email: 'Old@Example.com', verified: true },
            { id: 'e2', email: 'new@example.com', verified: true },
            { id: 'e3', email: 'unverified@example.com', verified: false },
        ];
        expect(pickVerifiedEmail(emails, 'e2')).toBe('new@example.com');
        expect(pickVerifiedEmail(emails, 'e3')).toBe('old@example.com');
        expect(pickVerifiedEmail([emails[2]], 'e3')).toBeNull();
    });

    it('re-links an existing row to a new Clerk id by verified email', async () => {
        rows.push({ id: 'existing', clerk_id: 'user_dev_1', email: 'Maruthi_R@example.com' });
        const id = await linkOrCreateUser({ clerkId: 'user_prod_1', email: 'maruthi_r@example.com' });
        expect(id).toBe('existing');
        expect(rows).toHaveLength(1);
        expect(rows[0].clerk_id).toBe('user_prod_1');
    });

    it('does not treat "_" in an email as a wildcard', async () => {
        rows.push({ id: 'other', clerk_id: 'user_dev_2', email: 'aXb@example.com' });
        const id = await linkOrCreateUser({ clerkId: 'user_prod_2', email: 'a_b@example.com' });
        expect(id).not.toBe('other');
        expect(rows.find(r => r.id === 'other')?.clerk_id).toBe('user_dev_2');
    });

    it('creates a new user when neither the Clerk id nor the email is known', async () => {
        const id = await linkOrCreateUser({ clerkId: 'user_new', email: null });
        expect(id).toBeTruthy();
        expect(rows[0]).toMatchObject({ clerk_id: 'user_new', email: 'clerk_user_new@counterdraft.app' });
    });

    it('backfills the real email on a row that has a placeholder', async () => {
        rows.push({ id: 'p', clerk_id: 'user_dev_3', email: 'clerk_user_dev_3@counterdraft.app' });
        const id = await linkOrCreateUser({ clerkId: 'user_dev_3', email: 'me@example.com' });
        expect(id).toBe('p');
        expect(rows[0].email).toBe('me@example.com');
    });
});
