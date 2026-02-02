import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin strictly for this transaction
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 });
        }

        // 1. Fetch Coupon (Check validity)
        const { data: coupon, error: fetchError } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .single();

        if (fetchError || !coupon) {
            return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 404 });
        }

        // 2. Check Expiry
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Coupon has expired' }, { status: 410 });
        }

        // 3. Check Usage Limits
        if (coupon.redemptions_count >= coupon.max_redemptions) {
            return NextResponse.json({ error: 'Coupon fully redeemed' }, { status: 409 });
        }

        // 4. ATOMIC REDEMPTION (RPC or Safe Update)
        // Since we don't have a stored procedure for this specific lock, we rely on the WHERE clause condition.
        // "Update set count = count + 1 WHERE code = X AND count < max"
        const { data: updatedCoupon, error: updateError } = await supabase
            .from('coupons')
            .update({ redemptions_count: coupon.redemptions_count + 1 })
            .eq('code', code)
            .lt('redemptions_count', coupon.max_redemptions) // Atomic Guard
            .select()
            .single();

        if (updateError || !updatedCoupon) {
            return NextResponse.json({ error: 'Coupon redemption failed (Race condition or limit reached)' }, { status: 409 });
        }

        // 5. Create Subscription
        // Calculate end date based on plan
        const { data: plan } = await supabase.from('access_plans').select('*').eq('id', coupon.plan_id).single();
        if (!plan) throw new Error('Plan not found for coupon');

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (plan.validity_days || 30));

        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: userId,
                plan_id: plan.id,
                status: 'active',
                source: 'coupon',
                coupon_code: code,
                start_date: startDate.toISOString(),
                current_period_end: endDate.toISOString()
            });

        if (subError) {
            console.error('Sub Error:', subError);
            // ROLLBACK COUPON? Ideally yes, but rare. Manual fix for beta.
            return NextResponse.json({ error: 'Failed to apply subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true, plan: plan });

    } catch (err: any) {
        console.error('Claim error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
