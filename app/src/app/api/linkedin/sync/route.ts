import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { linkedinFetch } from '@/lib/linkedin-network';

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
 */
function isEligibleForBeliefs(text: string, isReshare: boolean): boolean {
    // Exclude reshares
    if (isReshare) return false;

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
 * POST /api/linkedin/sync
 * Syncs LinkedIn posts to raw_posts table
 */
export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Supabase user
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
        const postsUrl = new URL('https://api.linkedin.com/v2/ugcPosts');
        postsUrl.searchParams.set('q', 'authors');
        postsUrl.searchParams.set('authors', `List(urn:li:person:${account.platform_user_id})`);
        postsUrl.searchParams.set('sortBy', 'LAST_MODIFIED');
        postsUrl.searchParams.set('count', '50');

        const postsResponse = await linkedinFetch(postsUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'X-Restli-Protocol-Version': '2.0.0',
            },
        }, 3, 120000);

        if (!postsResponse.ok) {
            const errorText = await postsResponse.text();
            console.error('LinkedIn API error:', postsResponse.status, errorText);

            if (postsResponse.status === 403) {
                return NextResponse.json({
                    error: 'LinkedIn API access denied. r_member_social scope may not be approved.',
                    code: 'SCOPE_NOT_APPROVED'
                }, { status: 403 });
            }

            if (postsResponse.status === 429) {
                return NextResponse.json({
                    error: 'Rate limited by LinkedIn. Please try again later.',
                    code: 'RATE_LIMITED'
                }, { status: 429 });
            }

            return NextResponse.json({ error: 'Failed to fetch posts from LinkedIn' }, { status: 500 });
        }

        const postsData = await postsResponse.json();
        const linkedInPosts: LinkedInPost[] = ((postsData as { elements: UGCPost[] }).elements || []).map((post: UGCPost) => {
            const shareContent = post.specificContent?.['com.linkedin.ugc.ShareContent'];
            const text = shareContent?.shareCommentary?.text || '';

            return {
                id: post.id,
                text,
                createdAt: new Date(post.created.time).toISOString(),
                isReshare: !!post.resharedContent,
            };
        });

        // Get existing post IDs to avoid duplicates
        const { data: existingPosts } = await supabase
            .from('raw_posts')
            .select('platform_post_id')
            .eq('user_id', user.id)
            .eq('source', 'linkedin');

        const existingIds = new Set(existingPosts?.map(p => p.platform_post_id) || []);

        // Filter new posts and prepare for insertion
        const newPosts = linkedInPosts
            .filter(post => !existingIds.has(post.id) && post.text.trim().length > 0)
            .map(post => ({
                user_id: user.id,
                content: post.text,
                source: 'linkedin',
                platform_post_id: post.id,
                posted_at: post.createdAt,
                is_belief_eligible: isEligibleForBeliefs(post.text, post.isReshare),
                is_inspiration: false,
            }));

        // Insert new posts
        let insertedCount = 0;
        if (newPosts.length > 0) {
            const { error: insertError, data: inserted } = await supabase
                .from('raw_posts')
                .insert(newPosts)
                .select('id');

            if (insertError) {
                console.error('Error inserting posts:', insertError);
                return NextResponse.json({ error: 'Failed to save posts' }, { status: 500 });
            }

            insertedCount = inserted?.length || 0;
        }

        return NextResponse.json({
            success: true,
            synced: insertedCount,
            total: linkedInPosts.length,
            skipped: linkedInPosts.length - insertedCount,
            eligible: newPosts.filter(p => p.is_belief_eligible).length,
        });
    } catch (error) {
        console.error('Error syncing LinkedIn posts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
