import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { claimInvite } from '@/lib/billing/invites';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();

        // Brute force protection
        const ip = getClientIp(req);
        const limitResult = rateLimit(`coupon:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many tries. Wait 15 minutes and try again.', code: 'rate_limited' }, { status: 429 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'Sign in first, then use your invite.', code: 'signed_out' }, { status: 401 });
        }

        const { code } = await req.json();
        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Enter an invite code.', code: 'missing' }, { status: 400 });
        }

        const result = await claimInvite(userId, code);
        if (!result.ok) {
            return NextResponse.json({ error: result.error, code: result.code, period_end: result.periodEnd ?? null }, { status: result.status });
        }

        return NextResponse.json({ success: true, plan: { id: result.planId, display_name: result.planName }, period_end: result.periodEnd });
    } catch (err: unknown) {
        console.error('Claim error:', err);
        return NextResponse.json({ error: "Something went wrong. Try again in a minute.", code: 'error' }, { status: 500 });
    }
}
