
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { linkOrCreateUser, pickVerifiedEmail } from '@/lib/user-sync';

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        console.error('Missing CLERK_WEBHOOK_SECRET');
        return new NextResponse('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local', { status: 500 });
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new NextResponse('Error occured -- no svix headers', {
            status: 400
        });
    }

    // Get the body
    const body = await req.text();

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new NextResponse('Error occured', {
            status: 400
        });
    }

    const eventType = evt.type;

    console.log(`Webhook with and ID of ${evt.data.id} and type of ${eventType}`);

    if (eventType === 'user.created' || eventType === 'user.updated') {
        const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } = evt.data;
        const email = pickVerifiedEmail(
            (email_addresses || []).map(e => ({ id: e.id, email: e.email_address, verified: e.verification?.status === 'verified' })),
            primary_email_address_id
        );
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();

        // Finds the row by clerk_id, or re-links an existing row with the same verified email
        // (Clerk ids change between instances), or creates one
        const userId = await linkOrCreateUser({ clerkId: id, email, name: fullName, avatarUrl: image_url });
        if (!userId) {
            return new NextResponse('Error syncing user', { status: 500 });
        }

        const { error } = await supabaseAdmin
            .from('users')
            .update({
                ...(email ? { email } : {}),
                full_name: fullName,
                avatar_url: image_url,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('Error updating user in Supabase:', error);
            return new NextResponse('Error updating user', { status: 500 });
        }
    } else if (eventType === 'user.deleted') {
        const { id } = evt.data;

        if (id) {
            // Delete by clerk_id, not by id
            const { error } = await supabaseAdmin.from('users').delete().eq('clerk_id', id);
            if (error) {
                console.error('Error deleting user from Supabase:', error);
                return new NextResponse('Error deleting user', { status: 500 });
            }
        }
    }

    return new NextResponse('', { status: 200 });
}
