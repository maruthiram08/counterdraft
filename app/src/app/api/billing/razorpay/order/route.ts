import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/billing/razorpay';
import { getOrCreateUser } from '@/lib/user-sync';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PAID_PLANS } from '@/lib/billing/plans';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId } = await req.json();

        // 1. Validate Plan
        const plan = PAID_PLANS[planId as string];
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
        }

        // 1.5. Refuse to charge for a plan we could not record afterwards
        // (subscriptions.plan_id references access_plans, so a missing row would fail after payment)
        const { data: planRow } = await supabaseAdmin
            .from('access_plans')
            .select('id')
            .eq('id', planId)
            .maybeSingle();
        if (!planRow) {
            console.error('[Razorpay] Plan missing from access_plans, refusing order:', planId);
            return NextResponse.json({ error: 'This plan is not available yet. Please try again later.' }, { status: 503 });
        }

        // 2. Create Order (amount is already in the smallest currency unit)
        const options = {
            amount: plan.amount,
            currency: plan.currency,
            receipt: `rcpt_${Date.now()}_${userId.substring(0, 5)}`,
            notes: {
                userId: userId,
                planId: planId
            }
        };

        const order = await razorpay.orders.create(options);

        // 3. Return Order Details
        return NextResponse.json({
            orderId: order.id,
            currency: order.currency,
            amount: order.amount,
            keyId: process.env.RP_KEY_ID || process.env.rp_key_id
        });

    } catch (error: unknown) {
        console.error('Razorpay Order Create Error:', error);
        // Razorpay errors are objects with error.description, not Error instances
        const description = (error as { error?: { description?: string } })?.error?.description;
        const message = description || (error instanceof Error ? error.message : 'Could not start the payment.');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
