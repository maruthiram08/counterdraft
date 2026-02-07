
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

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
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const email = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : null;
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();

        // Check if user exists by clerk_id
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('clerk_id', id)
            .single();

        if (existingUser) {
            // Update existing user (don't touch id)
            const { error } = await supabaseAdmin
                .from('users')
                .update({
                    email: email,
                    full_name: fullName,
                    avatar_url: image_url,
                    updated_at: new Date().toISOString()
                })
                .eq('clerk_id', id);

            if (error) {
                console.error('Error updating user in Supabase:', error);
                return new NextResponse('Error updating user', { status: 500 });
            }
        } else {
            // Create new user (let Supabase generate id, set clerk_id)
            const { error } = await supabaseAdmin
                .from('users')
                .insert({
                    clerk_id: id,
                    email: email,
                    name: fullName || 'Counterdraft User',
                    avatar_url: image_url,
                });

            if (error) {
                console.error('Error creating user in Supabase:', error);
                return new NextResponse('Error creating user', { status: 500 });
            }
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
