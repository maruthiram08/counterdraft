import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { PRICING_CONFIG } from '@/lib/constants/pricing';

export async function POST(req: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId
        } = await req.json();

        const userId = await getOrCreateUser();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', (process.env.RP_KEY_SECRET || process.env.rp_key_secret)!)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('[Razorpay] Invalid Signature', { expectedSignature, razorpay_signature });
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
        }

        // 1.5. Verify Order Ownership (Prevent Replay/Injection)
        // We must ensure this order was actually created for THIS user.
        // We need to fetch the order from Razorpay to check the notes.
        const { razorpay } = require('@/lib/billing/razorpay');
        const order = await razorpay.orders.fetch(razorpay_order_id);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status !== 'paid' && order.status !== 'attempted') {
            // Just a warning, sometimes status lags slightly, but usually it should be paid or attempted
            console.warn('[Razorpay] Order status is', order.status);
        }

        if (order.notes?.userId !== userId) {
            console.error('[Razorpay] Order Ownership Mismatch', {
                currentUserId: userId,
                orderUserId: order.notes?.userId
            });
            return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 });
        }

        // 2. Determine Plan Details
        let status = 'active';
        let plan_id = planId;

        // Calculate End Date
        const now = new Date();
        let endDate = new Date();
        if (planId === PRICING_CONFIG.PLANS.INDIA.MONTHLY) {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (planId === PRICING_CONFIG.PLANS.INDIA.YEARLY) {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        // 3. Provision Subscription in DB
        // Check existing
        const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        let error;
        if (existingSub) {
            const { error: updateError } = await supabaseAdmin
                .from('subscriptions')
                .update({
                    status: 'active',
                    plan_id: plan_id,
                    current_period_end: endDate.toISOString(),
                    cancel_at_period_end: false,
                    provider: 'razorpay',
                    subscription_id: razorpay_order_id // Store Order ID as sub ID references
                })
                .eq('user_id', userId);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseAdmin
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    status: 'active',
                    plan_id: plan_id,
                    current_period_end: endDate.toISOString(),
                    provider: 'razorpay',
                    subscription_id: razorpay_order_id
                });
            error = insertError;
        }

        if (error) throw error;

        return NextResponse.json({ success: true, redirectUrl: '/workspace?upgraded=true' });

    } catch (error: any) {
        console.error('[Razorpay] Verification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
