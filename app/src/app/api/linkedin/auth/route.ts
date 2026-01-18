import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/linkedin/auth
 * Initiates LinkedIn OAuth 2.0 flow
 * Redirects user to LinkedIn authorization page
 */
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL));
        }

        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`;

        if (!clientId) {
            console.error('LINKEDIN_CLIENT_ID not configured');
            return NextResponse.redirect(
                new URL('/settings?error=linkedin_not_configured', process.env.NEXT_PUBLIC_APP_URL)
            );
        }

        // LinkedIn OAuth 2.0 scopes
        // r_liteprofile: Basic profile info
        // r_member_social: Read user's posts (requires approval)
        // w_member_social: Publish posts (requires approval)
        const scopes = ['openid', 'profile', 'email', 'w_member_social'];

        // Generate state for CSRF protection
        const state = Buffer.from(JSON.stringify({
            clerkUserId: userId,
            timestamp: Date.now(),
        })).toString('base64');

        // Build LinkedIn authorization URL
        const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scopes.join(' '));
        authUrl.searchParams.set('state', state);

        return NextResponse.redirect(authUrl.toString());
    } catch (error) {
        console.error('Error initiating LinkedIn OAuth:', error);
        return NextResponse.redirect(
            new URL('/settings?error=oauth_failed', process.env.NEXT_PUBLIC_APP_URL)
        );
    }
}
