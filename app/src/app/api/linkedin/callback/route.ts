import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { linkedinFetch } from '@/lib/linkedin-network';

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
                new URL(`/settings?error=${error}`, process.env.NEXT_PUBLIC_APP_URL!)
            );
        }

        const storedState = request.cookies.get('linkedin_oauth_state')?.value;

        if (!code || !state) {
            console.error('[LinkedIn Callback] Missing parameters:', { code: !!code, state: !!state });
            return NextResponse.redirect(new URL('/settings?error=invalid_state', process.env.NEXT_PUBLIC_APP_URL!));
        }

        console.log('[LinkedIn Callback] Processing callback for code:', code.substring(0, 10) + '...');

        // Decode and validate state
        let stateData: { clerkUserId: string; timestamp: number };
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString());

            // Check state freshness (10 minute window)
            if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
                console.error('[LinkedIn Callback] State expired');
                return NextResponse.redirect(new URL('/settings?error=state_expired', process.env.NEXT_PUBLIC_APP_URL!));
            }
        } catch (e) {
            console.error('[LinkedIn Callback] Invalid state format or parsing error:', e);
            return NextResponse.redirect(new URL('/settings?error=invalid_state_format', process.env.NEXT_PUBLIC_APP_URL!));
        }

        // Exchange code for access token
        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        });

        console.log('[LinkedIn Callback] Exchanging token...');
        // Use shared linkedinFetch (robust)
        const tokenResponse = await linkedinFetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        }, 5, 60000);

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('[LinkedIn Callback] Token exchange failed:', tokenResponse.status, errorText);

            if (errorText.includes('timeout')) {
                return NextResponse.redirect(new URL('/settings?error=timeout', process.env.NEXT_PUBLIC_APP_URL!));
            }
            return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', process.env.NEXT_PUBLIC_APP_URL!));
        }

        const tokenData = await tokenResponse.json() as LinkedInTokenResponse;
        console.log('[LinkedIn Callback] Token exchanged successfully. Access Token length:', tokenData.access_token.length);

        // Fetch user profile
        console.log('[LinkedIn Callback] Fetching user info...');
        let userInfo: LinkedInUserInfo = {
            sub: 'unknown',
            name: 'LinkedIn User',
            given_name: '',
            family_name: '',
            picture: undefined,
            email: undefined
        };

        try {
            // AGGRESSIVE SOFT FAIL: Only 2 retries, 10s timeout using shared fetch
            const userInfoResponse = await linkedinFetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                },
            }, 2, 120000);

            if (userInfoResponse.ok) {
                userInfo = await userInfoResponse.json() as unknown as LinkedInUserInfo;
                console.log('[LinkedIn Callback] User info fetched:', userInfo.sub);
            } else {
                console.error('[LinkedIn Callback] User info fetch failed (Soft Fail):', userInfoResponse.status, await userInfoResponse.text());
                // Proceed with default userInfo
            }
        } catch (err) {
            console.error('[LinkedIn Callback] User info fetch timed out/failed (Soft Fail):', err);
            // Proceed with default userInfo
        }

        // Get Supabase user by Clerk ID
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', stateData.clerkUserId)
            .single();

        if (userError || !user) {
            console.error('[LinkedIn Callback] User not found in DB for clerkId:', stateData.clerkUserId, userError);
            return NextResponse.redirect(
                new URL('/settings?error=user_not_found', process.env.NEXT_PUBLIC_APP_URL!)
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
                refresh_token: tokenData.refresh_token,
                token_expires_at: tokenExpiresAt.toISOString(),
                scopes: tokenData.scope ? tokenData.scope.split(',') : ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
                profile_name: userInfo.name,
                profile_picture: userInfo.picture,
                connected_at: new Date().toISOString(),
                revoked: false,
            }, { onConflict: 'user_id, platform' });

        if (upsertError) {
            console.error('[LinkedIn Callback] Database update failed:', upsertError);
            return NextResponse.redirect(new URL('/settings?error=db_error', process.env.NEXT_PUBLIC_APP_URL!));
        }

        console.log('[LinkedIn Callback] Connection successful!');
        return NextResponse.redirect(new URL('/settings?success=linkedin_connected', process.env.NEXT_PUBLIC_APP_URL!));

    } catch (error) {
        console.error('[LinkedIn Callback] Unexpected error:', error);
        return NextResponse.redirect(
            new URL('/settings?error=callback_failed', process.env.NEXT_PUBLIC_APP_URL!)
        );
    }
}
