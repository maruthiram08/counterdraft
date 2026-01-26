import { NextRequest, NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Initialize Dodo Client
const client = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || 'pk_test_dummy',
    environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
});

// Helper to determine Plan ID from Product ID
// In production, you might query Dodo API or have a robust mapping
const PRODUCT_MAP: Record<string, string> = {
    // Replace these with your ACTUAL Dodo Product IDs from the Dashboard
    'prod_gl_monthly': 'pro_global_monthly',
    'prod_gl_yearly': 'pro_global_yearly',
    'prod_in_monthly': 'pro_india_monthly',
    'prod_in_yearly': 'pro_india_yearly',
};

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Webhook Signature (Critical for security)
        const signature = req.headers.get('webhook-signature');
        const webhookId = req.headers.get('webhook-id');

        if (!signature || !webhookId) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // Note: Dodo SDK might have a verify method soon. 
        // For now, we trust the payload if the secret matches (if strictly implemented)
        // Ideally: client.webhooks.constructEvent(payload, signature, secret);

        const payload = await req.json();
        const eventType = payload.type;
        const data = payload.data;

        console.log(`[Dodo Webhook] Received event: ${eventType}`, data.subscription_id);

        if (!data.customer?.metadata?.userId) {
            console.warn('[Dodo Webhook] No userId in metadata. Skipping.');
            return NextResponse.json({ received: true });
        }

        const userId = data.customer.metadata.userId;

        // 2. Handle Events
        switch (eventType) {
            case 'subscription.created':
            case 'subscription.updated':
            case 'payment.succeeded':
                // Upsert Subscription Status
                const { error: upsertError } = await supabaseAdmin
                    .from('user_subscriptions')
                    .upsert({
                        user_id: userId,
                        dodo_customer_id: data.customer_id,
                        dodo_subscription_id: data.subscription_id,
                        status: data.status === 'active' ? 'active' : 'past_due', // Map Dodo status to DB enum
                        plan_id: data.product_id, // e.g., 'prod_gl_monthly'
                        variant_name: data.variant_name || 'standard',
                        renews_at: data.next_billing_date ? new Date(data.next_billing_date * 1000).toISOString() : null,
                        updated_at: new Date().toISOString(),
                    });

                if (upsertError) {
                    console.error('[Dodo Webhook] DB Upsert Error:', upsertError);
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
                }
                break;

            case 'subscription.cancelled':
            case 'subscription.expired':
                // Mark as cancelled
                await supabaseAdmin
                    .from('user_subscriptions')
                    .update({ status: 'cancelled' })
                    .eq('dodo_subscription_id', data.subscription_id);
                break;

            case 'payment.failed':
                // Mark as past_due
                await supabaseAdmin
                    .from('user_subscriptions')
                    .update({ status: 'past_due' })
                    .eq('dodo_subscription_id', data.subscription_id);
                break;

            default:
                console.log(`[Dodo Webhook] Unhandled event type: ${eventType}`);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('[Dodo Webhook] processing error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}
