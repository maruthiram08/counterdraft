import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface IntegrationStatus {
    platform: string;
    connected: boolean;
    profileName?: string;
    profilePicture?: string;
    connectedAt?: string;
    scopes?: string[];
}

/**
 * GET /api/integrations
 * Returns the status of all platform integrations for the current user
 */
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from Supabase
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get all connected accounts for this user
        const { data: accounts, error: accountsError } = await supabase
            .from('connected_accounts')
            .select('platform, profile_name, profile_picture, connected_at, scopes, revoked')
            .eq('user_id', user.id)
            .eq('revoked', false);

        if (accountsError) {
            console.error('Error fetching connected accounts:', accountsError);
            return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
        }

        // Build status map for all supported platforms
        const supportedPlatforms = ['linkedin', 'notion', 'google_docs'];
        const integrations: IntegrationStatus[] = supportedPlatforms.map(platform => {
            const account = accounts?.find(a => a.platform === platform);
            return {
                platform,
                connected: !!account,
                profileName: account?.profile_name,
                profilePicture: account?.profile_picture,
                connectedAt: account?.connected_at,
                scopes: account?.scopes,
            };
        });

        return NextResponse.json({ integrations });
    } catch (error) {
        console.error('Error in integrations API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
