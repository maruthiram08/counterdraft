import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { code, planId, maxUses, discount, validDays } = await req.json();

        const pct = Number(discount ?? 100);
        if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
            return NextResponse.json({ error: 'Discount must be between 1 and 100' }, { status: 400 });
        }

        if (!code || !planId) {
            return NextResponse.json({ error: 'Code and Plan ID are required' }, { status: 400 });
        }

        // Free invites default to one person and 14 days; 0 days means the link never ends
        const uses = Number.isFinite(Number(maxUses)) && Number(maxUses) >= 1 ? Math.floor(Number(maxUses)) : 1;
        const days = validDays === undefined || validDays === null || validDays === '' ? (pct >= 100 ? 14 : 0) : Number(validDays);
        const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

        // Insert into coupons table
        const { data, error } = await supabase
            .from('coupons')
            .insert({
                code: code.toUpperCase(),
                plan_id: planId,
                max_redemptions: uses,
                expires_at: expiresAt,
                discount_percent: pct, // 100 = free invite, less = discount at checkout
                is_active: true,
                redemptions_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating coupon:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
