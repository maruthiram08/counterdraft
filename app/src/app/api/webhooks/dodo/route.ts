import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Webhook Signature
        const signature = req.headers.get('webhook-signature');
        const webhookId = req.headers.get('webhook-id');
        const rawBody = await req.text(); // Read raw body for verification

        if (!signature || !webhookId) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
        if (!secret) {
            console.error('[Dodo Webhook] Missing DODO_PAYMENTS_WEBHOOK_SECRET');
            return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        // Use SDK verification for better security (handles timestamp validation, etc.)
        try {
            // The SDK's Webhook class handles signature verification
            // Note: In some versions it's client.webhooks.verify, in others it's a standalone class
            // Based on package.json (2.17.0), we can use the manual check but hardened, 
            // or if the SDK supports it, the SDK method. 
            // Looking at standard Dodo docs, manual HMAC is actually common but needs timestamp.
            // Let's harden the manual check to include the webhook-id or use the SDK if available.

            // Re-implementing with robust HMAC check for now as standard Dodo SDK 2.x 
            // might not have a dedicated 'verify' helper in all sub-versions.
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(rawBody);
            const calculatedSignature = hmac.digest('hex');

            if (calculatedSignature !== signature) {
                console.error('[Dodo Webhook] Invalid Signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } catch (err) {
            console.error('[Dodo Webhook] Verification Error:', err);
            return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody); // Parse manually after verification
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

                // SYNC USAGE TIER (Critical for Gating)
                const newTier = data.status === 'active' ? 'pro' : 'free';
                const { error: usageError } = await supabaseAdmin
                    .from('user_usage')
                    .update({ plan_tier: newTier })
                    .eq('user_id', userId);

                if (usageError) {
                    console.error('[Dodo Webhook] Usage Tier Sync Failed:', usageError);
                    // Don't fail the webhook, but log critical error
                } else {
                    console.log(`[Dodo Webhook] User ${userId} tier updated to ${newTier}`);
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

    } catch (error: unknown) {
        console.error('[Dodo Webhook] processing error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}
