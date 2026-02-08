import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/billing/razorpay';
import { getOrCreateUser } from '@/lib/user-sync';

import { PRICING_CONFIG } from '@/lib/constants/pricing';

const PLANS: Record<string, { amount: number; currency: string }> = {
    [PRICING_CONFIG.PLANS.INDIA.MONTHLY]: { amount: 999, currency: 'INR' }, // ₹999
    [PRICING_CONFIG.PLANS.INDIA.YEARLY]: { amount: 9999, currency: 'INR' }, // ₹9,999
};

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId } = await req.json();

        // 1. Validate Plan
        const plan = PLANS[planId as keyof typeof PLANS];
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
        }

        // 2. Create Order
        // Amount must be in smallest currency unit (paise)
        const amountInPaise = plan.amount * 100;

        const options = {
            amount: amountInPaise,
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
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
