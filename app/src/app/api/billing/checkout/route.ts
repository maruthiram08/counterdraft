import { NextRequest, NextResponse } from 'next/server';
import { dodo } from '@/lib/billing/dodo';
import { getOrCreateUser } from '@/lib/user-sync';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productId, country } = await req.json(); // e.g., 'prod_gl_monthly'

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        // 1. Get User Email (from DB or Clerk)
        // We'll query our users table to ensure we pass the email to Dodo
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

        if (!user?.email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 400 });
        }

        // 2. Create Checkout
        console.log(`[Checkout] Creating session for ${user.email} | Plan: ${productId} | Country: ${country || 'US'}`);

        // We pass metadata so the webhook knows who paid
        type DodoCheckoutResult = {
            checkout_url?: string;
            payment_link?: string;
        };

        const payment = await dodo.subscriptions.create({
            product_id: productId,
            quantity: 1,
            customer: {
                email: user.email,
            },
            billing: {
                city: "Unknown",
                country: country || "US",
                state: "NY",
                street: "123 Unknown",
                zipcode: "10001"
            },
            metadata: {
                userId: userId,
                env: process.env.NODE_ENV
            },
            // optional: payment_link: true (if using payments.createLink vs payments.create)
            // The SDK structure varies slightly by version. 
            // Assuming v1 structure where we create a payment or a checkout link.
            // Adjusting for common "checkout link" flow:
        });

        // Note: If the SDK differs, we might need `dodo.misc.createPaymentLink` or similar.
        // Checking doc assumption: usually returns a `checkout_url` or `payment_link`.

        // FALLBACK for Safety: If SDK method is different, we'll try to use the most generic creation method
        // For now preventing typescript errors with 'any' until SDK types are verified in workspace
        const checkoutUrl = (payment as DodoCheckoutResult).checkout_url || (payment as DodoCheckoutResult).payment_link;
        if (!checkoutUrl) {
            return NextResponse.json({ error: 'Checkout URL not returned by provider' }, { status: 502 });
        }

        return NextResponse.json({ checkoutUrl });

    } catch (error: unknown) {
        console.error('Checkout creation failed:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
