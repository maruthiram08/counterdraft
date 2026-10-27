import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrCreateUser } from '@/lib/user-sync';
import { razorpay } from '@/lib/billing/razorpay';
import { grantPaidPlan } from '@/lib/billing/provision';

export async function POST(req: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await req.json();

        const userId = await getOrCreateUser();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', (process.env.RP_KEY_SECRET || process.env.rp_key_secret)!)
            .update(body.toString())
            .digest('hex');

        const expectedBuf = Buffer.from(expectedSignature);
        const receivedBuf = Buffer.from(String(razorpay_signature ?? ''));
        if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
            console.error('[Razorpay] Invalid Signature');
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
        }

        // 2. Verify Order Ownership (Prevent Replay/Injection)
        // The plan, coupon and user come from the order notes we wrote, never from the request body
        const order = await razorpay.orders.fetch(razorpay_order_id);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.notes?.userId !== userId) {
            console.error('[Razorpay] Order Ownership Mismatch', {
                currentUserId: userId,
                orderUserId: order.notes?.userId
            });
            return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 });
        }

        // 3. Provision (shared with the order.paid webhook, idempotent per order)
        await grantPaidPlan({
            userId,
            planId: String(order.notes?.planId ?? ''),
            orderId: razorpay_order_id,
            couponCode: order.notes?.couponCode ? String(order.notes.couponCode) : null,
        });

        return NextResponse.json({ success: true, redirectUrl: '/workspace?upgraded=true' });

    } catch (error: unknown) {
        console.error('[Razorpay] Verification Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
