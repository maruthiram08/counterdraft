import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { linkedinFetch } from '@/lib/linkedin-network';
import { extractBeliefs } from "@/lib/openai";
import { storeAnalysisResults } from "@/lib/belief-storage";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PublishRequest {
    draftId: string;
    content: string;
}

/**
 * POST /api/linkedin/publish
 * Publishes a draft to LinkedIn
 * 
 * Note: Publishing should feel "downstream" - not the main focus.
 * "When you're ready, this exists."
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: PublishRequest = await request.json();
        const { draftId, content } = body;

        if (!draftId || !content) {
            return NextResponse.json({ error: 'Missing draftId or content' }, { status: 400 });
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

        // Verify draft ownership
        const { data: draft, error: draftError } = await supabase
            .from('drafts')
            .select('id, user_id')
            .eq('id', draftId)
            .single();

        if (draftError || !draft || draft.user_id !== user.id) {
            return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
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
            return NextResponse.json({
                error: 'LinkedIn token expired. Please reconnect.',
                code: 'TOKEN_EXPIRED'
            }, { status: 401 });
        }

        // Format content for LinkedIn
        // LinkedIn doesn't support markdown, use line breaks
        const formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove markdown bold
            .replace(/\*(.*?)\*/g, '$1')       // Remove markdown italic
            .replace(/#{1,6}\s/g, '')          // Remove headers
            .trim();

        // Character limit check
        if (formattedContent.length > 5000) {
            return NextResponse.json({
                error: 'Content exceeds LinkedIn character limit (5000)',
                code: 'CONTENT_TOO_LONG'
            }, { status: 400 });
        }

        // Create LinkedIn post via UGC API
        const postBody = {
            author: `urn:li:person:${account.platform_user_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: formattedContent,
                    },
                    shareMediaCategory: 'NONE',
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        };

        // Publish to LinkedIn
        // Using custom fetch to avoid connection timeouts
        const publishResponse = await linkedinFetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(postBody),
        }, 3, 120000);

        if (!publishResponse.ok) {
            const errorText = await publishResponse.text();
            console.error('LinkedIn API error:', publishResponse.status, errorText);

            if (publishResponse.status === 403) {
                return NextResponse.json({
                    error: 'LinkedIn publishing not authorized. w_member_social scope required.',
                    code: 'SCOPE_NOT_APPROVED'
                }, { status: 403 });
            }

            if (publishResponse.status === 429) {
                return NextResponse.json({
                    error: 'Rate limited by LinkedIn. Please try again later.',
                    code: 'RATE_LIMITED'
                }, { status: 429 });
            }

            return NextResponse.json({ error: 'Failed to publish to LinkedIn' }, { status: 500 });
        }

        const publishData = await publishResponse.json() as any;
        const linkedInPostId = publishData.id;

        // Update draft with LinkedIn post URN
        await supabase
            .from('drafts')
            .update({
                status: 'published',
                linkedin_post_urn: linkedInPostId,
                published_at: new Date().toISOString(),
            })
            .eq('id', draftId);

        // Create published_posts record
        await supabase
            .from('published_posts')
            .insert({
                user_id: user.id,
                draft_id: draftId,
                platform: 'linkedin',
                platform_post_id: linkedInPostId,
                adapted_content: formattedContent,
                published_at: new Date().toISOString(),
            });

        // Generate LinkedIn URL
        const urnParts = linkedInPostId.split(':');
        const activityId = urnParts[urnParts.length - 1];
        const linkedInUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}`;

        // Auto-Extract Beliefs (Flywheel)
        try {
            console.log("Triggering Flywheel Extraction for Published Post...");
            // Run in background (no await) to return fast? 
            // Better to await to ensure consistency during beta testing.
            const analysis = await extractBeliefs([formattedContent]);
            await storeAnalysisResults(user.id, analysis);
            console.log("Flywheel Extraction Complete.");
        } catch (e) {
            console.error("Flywheel Extraction Failed:", e);
            // Don't fail the response, just log it
        }

        return NextResponse.json({
            success: true,
            postId: linkedInPostId,
            url: linkedInUrl,
            message: 'Successfully published to LinkedIn',
        });
    } catch (error) {
        console.error('Error publishing to LinkedIn:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
