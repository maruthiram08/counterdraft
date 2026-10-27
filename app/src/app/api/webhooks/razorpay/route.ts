import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { grantPaidPlan } from '@/lib/billing/provision';

// Razorpay calls this when an order is fully paid, so Pro is granted even if the
// buyer's browser never comes back to run /api/billing/razorpay/verify.
// Dashboard: Settings → Webhooks → https://counterdraft.com/api/webhooks/razorpay, event "order.paid".
export async function POST(req: NextRequest) {
    const secret = process.env.RP_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[Razorpay Webhook] Missing RP_WEBHOOK_SECRET');
        return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        console.error('[Razorpay Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    try {
        const event = JSON.parse(rawBody);
        if (event.event !== 'order.paid') {
            return NextResponse.json({ received: true });
        }

        const order = event.payload?.order?.entity;
        const notes = order?.notes || {};
        if (!order?.id || !notes.userId || !notes.planId) {
            console.warn('[Razorpay Webhook] order.paid without our notes, skipping', order?.id);
            return NextResponse.json({ received: true });
        }

        const result = await grantPaidPlan({
            userId: String(notes.userId),
            planId: String(notes.planId),
            orderId: order.id,
            couponCode: notes.couponCode ? String(notes.couponCode) : null,
        });
        console.log('[Razorpay Webhook] order.paid handled', { orderId: order.id, alreadyGranted: result.alreadyGranted });

        return NextResponse.json({ received: true });
    } catch (error) {
        // 500 makes Razorpay retry
        console.error('[Razorpay Webhook] Processing error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
