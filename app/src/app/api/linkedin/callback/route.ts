import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LinkedInTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
}

interface LinkedInUserInfo {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture?: string;
    email?: string;
}

/**
 * GET /api/linkedin/callback
 * Handles LinkedIn OAuth callback
 * Exchanges code for tokens and stores in database
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
            console.error('LinkedIn OAuth error:', error, errorDescription);
            return NextResponse.redirect(
                new URL(`/settings?error=${error}`, process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                new URL('/settings?error=missing_params', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        // Decode and validate state
        let stateData: { clerkUserId: string; timestamp: number };
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch {
            return NextResponse.redirect(
                new URL('/settings?error=invalid_state', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        // Check state freshness (10 minute window)
        if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
            return NextResponse.redirect(
                new URL('/settings?error=state_expired', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        const clientId = process.env.LINKEDIN_CLIENT_ID!;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`;

        // Exchange code for access token
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', errorData);
            return NextResponse.redirect(
                new URL('/settings?error=token_exchange_failed', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        const tokenData: LinkedInTokenResponse = await tokenResponse.json();

        // Fetch user profile using OpenID Connect userinfo endpoint
        const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userInfoResponse.ok) {
            console.error('Failed to fetch user info');
            return NextResponse.redirect(
                new URL('/settings?error=profile_fetch_failed', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        const userInfo: LinkedInUserInfo = await userInfoResponse.json();

        // Get Supabase user by Clerk ID
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', stateData.clerkUserId)
            .single();

        if (userError || !user) {
            console.error('User not found:', userError);
            return NextResponse.redirect(
                new URL('/settings?error=user_not_found', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        // Calculate token expiration
        const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        // Upsert connected account
        const { error: upsertError } = await supabase
            .from('connected_accounts')
            .upsert({
                user_id: user.id,
                platform: 'linkedin',
                platform_user_id: userInfo.sub,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                token_expires_at: tokenExpiresAt.toISOString(),
                scopes: tokenData.scope.split(' '),
                profile_name: userInfo.name,
                profile_picture: userInfo.picture || null,
                connected_at: new Date().toISOString(),
                revoked: false,
            }, {
                onConflict: 'user_id,platform',
            });

        if (upsertError) {
            console.error('Failed to save connection:', upsertError);
            return NextResponse.redirect(
                new URL('/settings?error=save_failed', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        // Success - redirect to settings
        return NextResponse.redirect(
            new URL('/settings?success=linkedin_connected', process.env.NEXT_PUBLIC_APP_URL)
        );
    } catch (error) {
        console.error('Error in LinkedIn callback:', error);
        return NextResponse.redirect(
            new URL('/settings?error=callback_failed', process.env.NEXT_PUBLIC_APP_URL)
        );
    }
}
