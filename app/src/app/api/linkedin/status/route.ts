import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LinkedInStatus {
    connected: boolean;
    profileName?: string;
    profilePicture?: string;
    connectedAt?: string;
    scopes?: string[];
    tokenExpired?: boolean;
}

/**
 * GET /api/linkedin/status
 * Returns the LinkedIn connection status for the current user
 */
export async function GET() {
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

        // Get LinkedIn connection
        const { data: account, error: accountError } = await supabase
            .from('connected_accounts')
            .select('profile_name, profile_picture, connected_at, scopes, token_expires_at, revoked')
            .eq('user_id', user.id)
            .eq('platform', 'linkedin')
            .single();

        if (accountError || !account || account.revoked) {
            const status: LinkedInStatus = { connected: false };
            return NextResponse.json(status);
        }

        // Check if token is expired
        const tokenExpired = account.token_expires_at
            ? new Date(account.token_expires_at) < new Date()
            : false;

        const status: LinkedInStatus = {
            connected: true,
            profileName: account.profile_name,
            profilePicture: account.profile_picture,
            connectedAt: account.connected_at,
            scopes: account.scopes,
            tokenExpired,
        };

        return NextResponse.json(status);
    } catch (error) {
        console.error('Error checking LinkedIn status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
