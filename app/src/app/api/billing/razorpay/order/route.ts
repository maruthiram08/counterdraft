import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/billing/razorpay';
import { getOrCreateUser } from '@/lib/user-sync';

const PLANS: Record<string, { amount: number; currency: string }> = {
    'pro_monthly': { amount: 2900, currency: 'INR' }, // ₹29
    'pro_yearly': { amount: 29900, currency: 'INR' }, // ₹299
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
            keyId: process.env.RP_KEY_ID
        });

    } catch (error: any) {
        console.error('Razorpay Order Create Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
