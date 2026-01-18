import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/linkedin/disconnect
 * Revokes LinkedIn connection for the current user
 */
export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Supabase user by Clerk ID
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Mark the LinkedIn connection as revoked
        const { error: updateError } = await supabase
            .from('connected_accounts')
            .update({
                revoked: true,
                access_token: null,
                refresh_token: null,
            })
            .eq('user_id', user.id)
            .eq('platform', 'linkedin');

        if (updateError) {
            console.error('Failed to disconnect LinkedIn:', updateError);
            return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'LinkedIn disconnected' });
    } catch (error) {
        console.error('Error disconnecting LinkedIn:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
