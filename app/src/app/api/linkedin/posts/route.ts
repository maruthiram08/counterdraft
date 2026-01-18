import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LinkedInPost {
    id: string;
    text: string;
    createdAt: string;
    isReshare: boolean;
}

interface UGCPostElement {
    text?: string;
}

interface UGCPost {
    id: string;
    created: { time: number };
    specificContent?: {
        'com.linkedin.ugc.ShareContent'?: {
            shareCommentary?: UGCPostElement;
            shareMediaCategory?: string;
        };
    };
    resharedContent?: unknown;
}

/**
 * Determines if a post is eligible for belief extraction
 * Following the "conservative by default" principle:
 * - Prefer longer posts over short ones
 * - Prefer original posts over reshares
 * - Prefer declarative language over questions
 * - Exclude comments entirely
 */
function isEligibleForBeliefs(post: LinkedInPost): boolean {
    const text = post.text;

    // Exclude reshares
    if (post.isReshare) return false;

    // Exclude very short posts (< 100 chars)
    if (text.length < 100) return false;

    // Exclude posts that are mostly questions
    const questionMarks = (text.match(/\?/g) || []).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    if (sentences > 0 && questionMarks / sentences > 0.5) return false;

    // Exclude posts that are just links or mentions
    const words = text.split(/\s+/).filter(w => !w.startsWith('@') && !w.startsWith('http'));
    if (words.length < 20) return false;

    return true;
}

/**
 * GET /api/linkedin/posts
 * Fetches user's LinkedIn posts and returns them
 */
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Supabase user and LinkedIn connection
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get LinkedIn access token
        const { data: account, error: accountError } = await supabase
            .from('connected_accounts')
            .select('access_token, platform_user_id, token_expires_at')
            .eq('user_id', user.id)
            .eq('platform', 'linkedin')
            .eq('revoked', false)
            .single();

        if (accountError || !account) {
            return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 400 });
        }

        // Check token expiration
        if (new Date(account.token_expires_at) < new Date()) {
            return NextResponse.json({ error: 'LinkedIn token expired', code: 'TOKEN_EXPIRED' }, { status: 401 });
        }

        // Fetch posts from LinkedIn API
        // Note: This requires r_member_social scope which needs LinkedIn approval
        const postsUrl = new URL('https://api.linkedin.com/v2/ugcPosts');
        postsUrl.searchParams.set('q', 'authors');
        postsUrl.searchParams.set('authors', `List(urn:li:person:${account.platform_user_id})`);
        postsUrl.searchParams.set('sortBy', 'LAST_MODIFIED');
        postsUrl.searchParams.set('count', '50');

        const postsResponse = await fetch(postsUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'X-Restli-Protocol-Version': '2.0.0',
            },
        });

        if (!postsResponse.ok) {
            const errorText = await postsResponse.text();
            console.error('LinkedIn API error:', postsResponse.status, errorText);

            // Handle specific error cases
            if (postsResponse.status === 403) {
                return NextResponse.json({
                    error: 'LinkedIn API access denied. r_member_social scope may not be approved.',
                    code: 'SCOPE_NOT_APPROVED'
                }, { status: 403 });
            }

            return NextResponse.json({ error: 'Failed to fetch posts from LinkedIn' }, { status: 500 });
        }

        const postsData = await postsResponse.json();

        // Transform posts
        const posts: LinkedInPost[] = (postsData.elements || []).map((post: UGCPost) => {
            const shareContent = post.specificContent?.['com.linkedin.ugc.ShareContent'];
            const text = shareContent?.shareCommentary?.text || '';

            return {
                id: post.id,
                text,
                createdAt: new Date(post.created.time).toISOString(),
                isReshare: !!post.resharedContent,
            };
        });

        // Mark eligibility
        const postsWithEligibility = posts.map(post => ({
            ...post,
            isEligible: isEligibleForBeliefs(post),
        }));

        return NextResponse.json({
            posts: postsWithEligibility,
            total: postsWithEligibility.length,
            eligible: postsWithEligibility.filter(p => p.isEligible).length,
        });
    } catch (error) {
        console.error('Error fetching LinkedIn posts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
